---
title: Hardening Guide
sidebar_position: 2
---

# Hardening Guide

Attache ships with secure defaults. This guide covers how to tune them — and the additional hardening steps that turn a reasonable deployment into a defensible one.

## Gateway configuration

### Loopback binding (default)

Attache binds the gateway to `127.0.0.1` by default:

```json
{
  "gateway": {
    "bind": "loopback",
    "allowTailscale": true
  }
}
```

The gateway isn't reachable from your local network. Remote access goes through Tailscale — authenticated, encrypted, and limited to your tailnet.

:::danger Don't bind to `0.0.0.0`
Censys and Bitsight scans found 135,000-220,000+ OpenClaw instances exposed to the internet without authentication ([initial scans](https://censys.io) reported 30,000+; the number grew rapidly). Binding to all interfaces is how you end up in that dataset.
:::

### Token auth (default)

Attache defaults to `token` auth mode:

```json
{
  "gateway": {
    "auth": {
      "mode": "token"
    }
  }
}
```

The alternative — `trusted-proxy` — delegates authentication to a reverse proxy. That's the attack surface for the critical origin bypass advisory (versions before 2026.3.11). A malicious web page can open a WebSocket through your proxy and get operator-level access. Attache uses token auth specifically to avoid this class of vulnerability.

### Tailscale: serve, not funnel

```json
{
  "gateway": {
    "tailscale": {
      "mode": "serve"
    }
  }
}
```

Attache configures `serve` mode, which keeps traffic within your tailnet. `funnel` punches a hole to the public internet through Tailscale's ingress — undoing most of the network isolation.

## Exec policy

This is the most important security decision in any OpenClaw deployment.

### Why Attache defaults to allowlist mode

```json
{
  "exec": {
    "security": "allowlist"
  }
}
```

Attache's exec policy defaults to allowlist mode. The agent requests approval for each new command pattern. You pre-approve specific commands and grant `allow-always` for patterns you trust. Everything else gets blocked.

The alternative — `exec.security: "full"` — means the agent can run any shell command, anytime, with no restrictions. If a prompt injection succeeds, the attacker gets arbitrary command execution under your agent's OS user.

The Auth0 security guide calls `"full"` mode the equivalent of giving a junior employee root access. Anthropic's Claude Code has an equivalent (`--dangerously-skip-permissions`) — the flag name speaks for itself.

### Building your allowlist

Before switching away from the default, look at what your agent actually runs:

```bash
# Find exec calls in recent session logs
grep -r "exec" ~/.openclaw/sessions/ | grep "command" | sort -u
```

Common patterns to allow:

- `git` for version control
- `bun run` for skill scripts
- `cat`, `ls`, `find` for reading files
- `curl` for API calls (consider restricting to specific domains)
- `op read` for 1Password access (or use the [secrets proxy daemon](#secrets-proxy-daemon) instead)

Start with an empty allowlist. Approve commands as the agent requests them. Less convenient than `"full"` but dramatically more defensible.

### Multiplexer bypass (CVE-2026-22175)

Versions before 2026.2.23 had a flaw where `busybox sh -c` and `toybox sh -c` could bypass allowlist checks. The allowlist didn't recognize these as shell wrappers. Make sure you're patched, and don't grant `allow-always` for shell wrapper binaries.

### OS-level sandboxing

OpenClaw's exec allowlist operates at the application layer. For stronger isolation, Anthropic [open-sourced their sandbox runtime](https://github.com/anthropic-experimental/sandbox-runtime) for Claude Code, which uses Linux bubblewrap and macOS seatbelt to enforce filesystem and network restrictions at the kernel level. Their approach reduced permission prompts by 84% while providing stronger guarantees than application-layer controls.

The key insight from their work: **effective sandboxing requires both filesystem and network isolation.** Without network isolation, a compromised agent exfiltrates files. Without filesystem isolation, a compromised agent escapes the sandbox to reach the network. You need both.

Attache doesn't integrate OS-level sandboxing yet, but it's on the [roadmap](./index.md#roadmap). For now, the exec allowlist, dedicated OS user, and network egress controls provide the primary boundaries.

### macOS seatbelt profiles for the admin user

Attache runs under a dedicated `openclaw` OS user, but some operations (system updates, LaunchDaemon management) require an admin-level account on headless macOS. To lock down this admin user:

1. **Keep exec allowlist mode.** Even the admin user should run under allowlist, not `"full"`.
2. **Apply a seatbelt sandbox profile** that restricts filesystem access to the agent's workspace and denies network access except to known endpoints:

```bash
# Example seatbelt profile for the admin agent
cat > /tmp/attache-admin.sb << 'EOF'
(version 1)
(deny default)
(allow file-read* (subpath "/Users/openclaw"))
(allow file-write* (subpath "/Users/openclaw/workspace"))
(allow network-outbound (remote tcp "127.0.0.1:*"))
(allow network-outbound (remote tcp "100.64.0.0/10:*"))  ; Tailscale
(allow process-exec (literal "/usr/bin/git"))
(allow process-exec (literal "/usr/local/bin/openclaw"))
EOF

# Run the agent under the sandbox
sandbox-exec -f /tmp/attache-admin.sb openclaw gateway start
```

3. **Combine with exec allowlist.** The seatbelt profile is a second layer. If the application-layer allowlist is bypassed (as in CVE-2026-22175), the OS-level sandbox still blocks unauthorized access.

This is defense in depth: the exec allowlist handles the common case, and the seatbelt profile catches what gets through.

## Secrets proxy daemon

Attache recommends removing direct `op read` from the exec allowlist and routing all secret access through a proxy daemon instead.

### The problem with direct `op read`

If `op read` is on the exec allowlist, any command the agent runs can read any secret the 1Password service account can access. A prompt injection that gets shell execution can immediately exfiltrate credentials.

### Architecture

The secrets proxy is a separate process that:

1. **Listens on a Unix domain socket** — not a TCP port. Only local processes can connect.
2. **Maintains a per-secret allowlist** — each agent is authorized to access specific secrets, not the entire vault.
3. **Logs every access** — which secret, which agent session, what time, what the agent said it needed it for.
4. **Supports DM approval for sensitive secrets** — production database credentials, signing keys, and payment API tokens require your explicit approval via Discord/Slack DM before the proxy returns the value.

```
Agent requests ANTHROPIC_API_KEY
  → Proxy checks allowlist: ✓ (routine credential)
  → Proxy runs `op read`, returns value
  → Logged: [2026-03-19T10:15:32Z] agent=personal secret=ANTHROPIC_API_KEY status=allowed

Agent requests PRODUCTION_DB_PASSWORD
  → Proxy checks allowlist: ✓ but flagged as sensitive
  → Proxy sends Discord DM: "Agent needs PRODUCTION_DB_PASSWORD
     for database migration. Approve?"
  → You tap Approve
  → Proxy runs `op read`, returns value
  → Logged: [2026-03-19T10:22:01Z] agent=personal secret=PRODUCTION_DB_PASSWORD status=approved_via_dm
```

### Setup

Remove `op` from the exec allowlist entirely. The agent talks to the proxy; the proxy talks to 1Password.

```json title="Exec allowlist — no op access"
{
  "exec": {
    "security": "allowlist",
    "allowlist": ["git", "bun", "cat", "ls", "find", "curl"]
  }
}
```

The proxy daemon runs as a separate LaunchDaemon with its own 1Password service account token. Even if the agent process is fully compromised, it can only access secrets the proxy's allowlist permits — and sensitive secrets still require your approval.

## Balancing autonomy and security

The most common objection to tightening security: "If my agent needs approval for everything, it stops working when I'm away from my desk." That's real. The answer isn't to choose between autonomy and security — it's to tier operations by risk.

### The four-tier model

**Tier 1 — Run freely, no approval needed**

Read-only operations with no side effects. Reading email, checking your calendar, searching Slack, browsing files in a repo, running `git status`, fetching web pages. Nothing destructive can happen. Let these run around the clock with zero friction.

This covers the majority of what an agent does in a typical day.

**Tier 2 — Pre-approved with guardrails**

Write operations within trusted, reversible boundaries. Creating a git branch, committing code, opening a pull request, drafting an email. These have side effects, but they're scoped and recoverable. A PR goes to a repo you control — you review it before merging. A draft email sits in your outbox until you send it.

Pre-approve these patterns in your exec allowlist. The agent works autonomously within these boundaries.

**Tier 3 — Approve once per session**

Operations with external side effects that you use regularly: sending email, posting messages to Slack channels, triggering deployments. These need a human check, but not on every invocation.

Use the [DM approval pattern](./multiplayer.md#secrets-approval-via-dm). The first time the agent needs to send an email in a session, it pings you via Discord DM. You tap yes from your phone. That approval holds for the session. One or two of these per day, not thirty.

**Tier 4 — Always require explicit approval**

Operations where getting it wrong has real consequences: deleting files or data, modifying SSH config, accessing production database credentials, running commands on remote servers, publishing to package registries, making financial transactions.

These ping you every time, with full context about what the agent wants to do and why. No caching, no session-level approval. The [secrets proxy daemon](#secrets-proxy-daemon) enforces this for credential access.

### Why this works when you're away

Tiers 1 and 2 cover the vast majority of daily agent activity — reading, researching, writing code, managing tasks, monitoring channels. All of it runs autonomously. The agent only blocks on tier 3 and 4 operations, which come up far less frequently.

Tier 3's "approve once per session" means you're not chained to your desk. A quick tap on your phone while you're at lunch, and the agent keeps working for hours.

### Scoped credentials reinforce the tiers

The tiering works even better with credential scoping:

- Instead of a full GitHub PAT, use a fine-grained token scoped to specific repos with read/write on contents and pull requests only
- Instead of full Gmail access, use a token that can read and draft but not send
- Instead of your personal SSH key, use a deploy key scoped to a single repo

The weaker the credential, the less damage a compromised or confused agent can do — and the more operations you can comfortably leave in tiers 1 and 2.

### Where this is heading

Anthropic's [OS-level sandboxing for Claude Code](https://www.anthropic.com/engineering/claude-code-sandboxing) points toward a future where the tiers are enforced by the operating system, not just configuration. Network isolation means an agent physically can't reach an attacker's server, even if prompt injection succeeds. Filesystem sandboxing means it can't read your SSH keys even if instructed to. The approval flow becomes a backstop for the small number of operations that cross sandbox boundaries, not the primary defense.

## Network egress controls

Attache's loopback binding and Tailscale handle inbound access. Outbound traffic deserves the same attention — a compromised agent with `curl` access can exfiltrate data to any server on the internet.

### DNS-level blocking

The simplest egress control is DNS filtering. Use a DNS resolver that blocks known malicious domains:

```bash
# Point the Mac mini at a filtering DNS resolver
# Example using NextDNS with a custom profile
networksetup -setdnsservers "Ethernet" 45.90.28.0 45.90.30.0
```

NextDNS, Pi-hole, or Cloudflare Gateway all work. Configure your profile to block:

- Known exfiltration endpoints (pastebin, ngrok, webhook.site, pipedream, requestbin)
- Newly registered domains (common for attacker C2 infrastructure)
- Uncategorized domains

### Firewall rules

For tighter control, use macOS's built-in packet filter to restrict outbound connections to known-good destinations:

```bash
# /etc/pf.conf addition for the openclaw user
# Allow only: Anthropic API, Slack API, Discord API, GitHub, Tailscale, 1Password
pass out proto tcp from any to api.anthropic.com port 443 user openclaw
pass out proto tcp from any to api.openai.com port 443 user openclaw
pass out proto tcp from any to slack.com port 443 user openclaw
pass out proto tcp from any to discord.com port 443 user openclaw
pass out proto tcp from any to github.com port 443 user openclaw
pass out proto tcp from any to my.1password.com port 443 user openclaw
block out log proto tcp from any to any user openclaw
```

This is the strongest pre-sandbox egress control available. A compromised agent can't call home if it can't resolve or connect to the attacker's server.

### Combining with the exec allowlist

Restrict `curl` to specific domains in the exec allowlist where possible. The combination of DNS filtering, firewall rules, and application-layer allowlists provides three independent layers — each one meaningful on its own, defense in depth together.

## Channel policies

### Slack: Attache defaults to allowlist mode

```json
{
  "channels": {
    "slack": {
      "groupPolicy": "allowlist"
    }
  }
}
```

With `groupPolicy: "open"`, anyone in any Slack channel where your bot is present can interact with it and trigger its full tool permissions. Attache defaults to `"allowlist"` to prevent this.

### Require mentions

```json
{
  "channels": {
    "slack": {
      "accounts": {
        "my-bot": {
          "channels": {
            "C0EXAMPLE": {
              "requireMention": true
            }
          }
        }
      }
    }
  }
}
```

When `requireMention` is on, the agent only processes messages that explicitly `@mention` it. Doesn't eliminate prompt injection, but meaningfully reduces the surface area.

### Discord guild allowlists

```json
{
  "channels": {
    "discord": {
      "groupPolicy": "allowlist",
      "guilds": {
        "YOUR_GUILD_ID": {
          "allowed": true,
          "requireMention": true
        }
      }
    }
  }
}
```

## Credential management

### 1Password with scoped vaults

Attache stores credentials in 1Password, not `openclaw.json`:

```bash
op read "op://Agent-Vault/ANTHROPIC_API_KEY/credential"
```

Create a dedicated vault — "Agent Credentials" or similar — that contains only what the agent needs. Your personal passwords, banking credentials, and everything else stays in vaults the service account can't see.

For high-value credentials, route through the [secrets proxy daemon](#secrets-proxy-daemon) instead of direct `op read`.

### GitHub tokens: use Apps or fine-grained PATs

**GitHub Apps (preferred):** Installation tokens are short-lived (1 hour) and scoped to specific repos and permissions:

```bash
# Store the app private key in 1Password
op read "op://Agent-Vault/GitHub App Key/private_key" > /tmp/gh-app-key.pem

# Generate an installation token
gh api -X POST /app/installations/{installation_id}/access_tokens \
  --input <(echo '{"repositories":["my-repo"],"permissions":{"contents":"write","pull_requests":"write"}}')
```

**Fine-grained PATs (acceptable):** Scope to specific repos, grant minimum permissions, set an expiration (90 days is reasonable).

:::warning Avoid classic PATs
Classic personal access tokens have broad, coarse scopes and no repository restrictions. A leaked classic PAT with `repo` scope exposes every private repository on your account.
:::

### The git credential proxy pattern

Anthropic's Claude Code team keeps git credentials outside the agent's environment entirely. A proxy service sits between the agent and GitHub. The agent authenticates to the proxy with a scoped, limited-purpose credential. The proxy validates the request (correct branch, correct repo, correct operation) and attaches the real authentication before forwarding to GitHub.

The agent never sees the actual git token. Even a fully compromised agent can't exfiltrate it. Worth building if you work with sensitive repositories.

### Rotate the gateway token after upgrading

If you've ever shared a pairing/setup code, it may contain your long-lived gateway token (versions before v2026.3.12). After upgrading:

```bash
openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
openclaw gateway restart
```

Re-pair any connected devices afterward.

### Credential rotation cadence

| Credential                       | Cadence                          | Why                                                |
| -------------------------------- | -------------------------------- | -------------------------------------------------- |
| 1Password service account token  | Quarterly                        | Static credential; rotation limits exposure window |
| GitHub App private key           | Annually                         | Installation tokens auto-expire hourly             |
| GitHub PAT                       | Every 90 days                    | Set expiration at creation as a forcing function   |
| LLM API keys (Anthropic, OpenAI) | Quarterly, or on billing anomaly | Watch for unexpected usage spikes                  |
| Gateway token                    | After upgrades; quarterly        | Pairing codes may have leaked the token            |

Since 1Password can't automate rotation, set calendar reminders. A rotation schedule you forget about isn't a rotation schedule.

## Log retention and rotation

### The problem

Gateway logs on active deployments can grow to tens of gigabytes. If your logs rotate before you detect a compromise, you've lost evidence. If they don't rotate at all, you'll run out of disk.

### Recommended configuration

Set up log rotation via a macOS LaunchDaemon that runs daily:

```xml title="/Library/LaunchDaemons/ai.openclaw.logrotate.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>ai.openclaw.logrotate</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>
      cd ~/.openclaw/logs &amp;&amp;
      for f in *.log; do
        [ -f "$f" ] || continue
        mv "$f" "$f.$(date +%Y%m%d)" &amp;&amp;
        gzip "$f.$(date +%Y%m%d)"
      done &amp;&amp;
      find . -name '*.gz' -mtime +90 -delete &amp;&amp;
      openclaw gateway reload
    </string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
</dict>
</plist>
```

**Retention policy:**

- **Active logs:** Rotated daily
- **Compressed archives:** Retained 90 days
- **Config audit log (`config-audit.jsonl`):** Retained 1 year (small file, high forensic value)

If you integrate with a SIEM or log aggregator, ship logs there before rotation. The local copies are your fallback, not your primary archive.

## Kill switch

If you suspect compromise:

```bash
openclaw gateway stop
```

That kills all agent sessions immediately. For a more targeted response, disable specific channel integrations in `openclaw.json` and restart.

Document your emergency procedure somewhere accessible under stress — not buried in a config file you have to SSH into the Mac mini to read.

## Backup and recovery

### Declarative recovery via Ansible

Attache's Ansible playbooks are the recovery mechanism. If you suspect compromise:

1. Stop the gateway
2. Rotate all credentials (see [Audit: credential rotation](./audit.md#credential-rotation))
3. Re-run the Ansible setup playbook to converge back to a known-good configuration:

```bash
ansible-playbook -i inventory/hosts site.yml --tags openclaw
```

This resets the gateway configuration, exec policy, channel policies, and OS-level settings to your declared state. Any drift introduced by a compromise gets overwritten.

### What to back up

| What                              | Where                                   | Frequency                        |
| --------------------------------- | --------------------------------------- | -------------------------------- |
| `openclaw.json` + channel configs | Git repo (encrypted if secrets present) | Every change                     |
| 1Password vault exports           | 1Password's own backup (automatic)      | N/A                              |
| Ansible playbooks + inventory     | Git repo                                | Every change                     |
| Gateway logs (compressed)         | Local + SIEM if available               | Daily rotation                   |
| Agent workspace (project files)   | Git repos                               | Continuous (normal git workflow) |

The key principle: your configuration and infrastructure live in version control. Your credentials live in 1Password. Your agent's work lives in git. If the Mac mini catches fire, you can rebuild on new hardware by running the playbook and cloning your repos.

## Version management

### Stay current

```bash
openclaw --version     # Check what you're running
npm update -g openclaw # Update to latest
```

The current stable release is **2026.3.12+**. If you're behind that, you're carrying known vulnerabilities.

### Where to watch for disclosures

- [OpenClaw GitHub releases](https://github.com/openclaw/openclaw/releases)
- OpenClaw Discord `#security` channel
- [NVD](https://nvd.nist.gov/) for formal CVE entries

### Patch SLA

Commit to a timeline and stick to it. Attache's defaults:

- **Critical (CVSS >= 9.0):** Same day.
- **High (CVSS 7.0-8.9):** Within 48 hours.
- **Medium and below:** Next maintenance window.

### Run the audit command

```bash
openclaw security audit          # Basic config check
openclaw security audit --deep   # Extended analysis
openclaw security audit --json   # For automation
```

This catches common misconfigurations, outdated versions, and known-bad settings. Run it after every config change and at least weekly.
