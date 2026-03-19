---
title: Hardening Guide
sidebar_position: 2
---

# Hardening Guide

Attaché ships with reasonable defaults, but "reasonable" and "secure" aren't the same thing. This guide covers the settings that actually matter — the ones that determine whether a prompt injection is a nuisance or a breach.

## Gateway configuration

### Bind to loopback

Your gateway should only listen on `127.0.0.1`. This is what Attaché configures by default:

```json
{
  "gateway": {
    "bind": "loopback",
    "allowTailscale": true
  }
}
```

With loopback binding, the gateway isn't reachable from your local network. Remote access goes through Tailscale — authenticated, encrypted, and limited to your tailnet.

:::danger Don't bind to `0.0.0.0`
Censys and Bitsight scans found over 30,000 OpenClaw instances exposed to the internet, many without authentication. Binding to all interfaces is the single fastest way to get compromised.
:::

### Use token auth

Attaché defaults to `token` auth mode:

```json
{
  "gateway": {
    "auth": {
      "mode": "token"
    }
  }
}
```

The alternative — `trusted-proxy` — delegates authentication to a reverse proxy. That's the attack surface for the critical origin bypass CVE (versions before 2026.3.11). A malicious web page can open a WebSocket through your proxy and get operator-level access to your gateway. Unless you have a specific, well-understood reason to use proxy auth, don't.

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

`serve` keeps traffic within your tailnet. `funnel` punches a hole to the public internet through Tailscale's ingress — which undoes most of the network isolation you set up in the first place.

## Exec policy

This is the most important security decision you'll make with OpenClaw.

### The problem with `exec.security: "full"`

Setting exec to `"full"` means your agent can run any shell command, anytime, with no restrictions. If a prompt injection succeeds — and prompt injection is an unsolved problem — the attacker gets arbitrary command execution under your agent's OS user.

```json title="Don't do this"
{
  "exec": {
    "security": "full"
  }
}
```

The Auth0 security guide calls this the equivalent of giving a junior employee root access. Anthropic's Claude Code team felt so strongly about their equivalent (`--dangerously-skip-permissions`) that they [deliberately made the flag name alarming](https://www.anthropic.com/engineering/claude-code-sandboxing).

### Use allowlist mode

```json title="Do this"
{
  "exec": {
    "security": "allowlist"
  }
}
```

In allowlist mode, the agent requests approval for each new command pattern. You can pre-approve specific commands and grant `allow-always` for patterns you trust. Everything else gets blocked.

### Building your allowlist

Before flipping the switch, look at what your agent actually runs:

```bash
# Find exec calls in recent session logs
grep -r "exec" ~/.openclaw/sessions/ | grep "command" | sort -u
```

Common things you'll need to allow:
- `git` for version control
- `bun run` for skill scripts
- `cat`, `ls`, `find` for reading files
- `curl` for API calls (consider restricting to specific domains)
- `op read` for 1Password access

Start with an empty allowlist. Approve commands as the agent requests them. It's less convenient than `"full"` but dramatically more defensible.

### Multiplexer bypass (CVE-2026-22175)

Versions before 2026.2.23 had a flaw where `busybox sh -c` and `toybox sh -c` could bypass allowlist checks. The allowlist didn't recognize these as shell wrappers, so any command wrapped in `busybox sh -c "..."` would execute unchecked. Make sure you're patched, and don't grant `allow-always` for shell wrapper binaries.

### OS-level sandboxing

OpenClaw's exec allowlist operates at the application layer. For stronger isolation, consider OS-level sandboxing.

Anthropic recently [open-sourced their sandbox runtime](https://github.com/anthropic-experimental/sandbox-runtime) for Claude Code, which uses Linux bubblewrap and macOS seatbelt to enforce filesystem and network restrictions at the kernel level. Their approach reduced permission prompts by 84% while providing stronger guarantees than application-layer controls alone.

The key insight from their work: **effective sandboxing requires both filesystem and network isolation.** Without network isolation, a compromised agent can exfiltrate files. Without filesystem isolation, a compromised agent can escape the sandbox to reach the network. You need both.

This is an area where Attaché's security model has room to grow. For now, the exec allowlist and dedicated OS user provide the primary boundaries. Watch this space.

## Balancing autonomy and security

The most common objection to tightening security is: "If my agent needs approval for everything, it stops working when I'm away from my desk." That's a real concern — and the answer isn't to choose between autonomy and security. It's to tier your operations by risk.

### The four-tier model

**Tier 1 — Run freely, no approval needed**

Read-only operations with no side effects. Reading email, checking your calendar, searching Slack, browsing files in a repo, running `git status`, fetching web pages. Nothing destructive can happen here. Let these run around the clock with zero friction.

This covers the majority of what an agent does in a typical day.

**Tier 2 — Pre-approved with guardrails**

Write operations within trusted, reversible boundaries. Creating a git branch, committing code, opening a pull request, drafting an email. These have side effects, but they're scoped and recoverable. A PR goes to a repo you control — you review it before merging. A draft email sits in your outbox until you send it.

Pre-approve these patterns in your exec allowlist. The agent works autonomously within these boundaries.

**Tier 3 — Approve once per session**

Operations with external side effects that you use regularly: sending email, posting messages to Slack channels, triggering deployments. These need a human check, but not on every single invocation.

Use the [DM approval pattern](./shared-access.md#secrets-approval-via-dm). The first time the agent needs to send an email in a session, it pings you via Discord DM: "I want to send this to Paula, here's the content — approve?" You tap yes from your phone. That approval holds for the session. You might get one or two of these per day, not thirty.

**Tier 4 — Always require explicit approval**

The operations where getting it wrong has real consequences: deleting files or data, modifying SSH config, accessing production database credentials, running commands on remote servers, publishing to package registries, making financial transactions.

These should ping you every time, with full context about what the agent wants to do and why. No caching, no session-level approval.

### Why this works when you're away from the keyboard

Tiers 1 and 2 cover the vast majority of daily agent activity — reading, researching, writing code, managing tasks, monitoring channels. All of it runs autonomously. The agent only blocks on tier 3 and 4 operations, which come up far less frequently.

And tier 3's "approve once per session" pattern means you're not chained to your desk. A quick tap on your phone while you're at lunch, and the agent keeps working for hours.

### Scoped credentials reinforce the tiers

The tiering works even better when combined with credential scoping:

- Instead of a full GitHub PAT, use a fine-grained token scoped to specific repos with read/write on contents and pull requests only
- Instead of full Gmail access, use a token that can read and draft but not send
- Instead of your personal SSH key, use a deploy key scoped to a single repo

The weaker the credential, the less damage a compromised or confused agent can do — and the more operations you can comfortably leave in tiers 1 and 2.

### Where this is heading

Anthropic's [OS-level sandboxing for Claude Code](https://www.anthropic.com/engineering/claude-code-sandboxing) points toward a future where the tiers are enforced by the operating system, not just configuration. Network isolation means an agent physically can't reach an attacker's server, even if prompt injection succeeds. Filesystem sandboxing means it can't read your SSH keys even if instructed to. The approval flow becomes a backstop for the small number of operations that cross sandbox boundaries, not the primary defense.

OpenClaw doesn't have OS-level sandboxing yet, but it's the direction the industry is moving. For now, the four-tier model with scoped credentials gets you most of the way there.

## Channel policies

### Slack: use allowlists

```json title="Too permissive"
{
  "channels": {
    "slack": {
      "groupPolicy": "open"
    }
  }
}
```

```json title="Controlled"
{
  "channels": {
    "slack": {
      "groupPolicy": "allowlist"
    }
  }
}
```

With `groupPolicy: "open"`, anyone in any Slack channel where your bot is present can interact with it and trigger its full tool permissions. That's a wide prompt injection surface in a busy workspace.

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

When `requireMention` is on, the agent only processes messages that explicitly `@mention` it. This means it's not reading — and potentially acting on — every message in the channel. It doesn't eliminate prompt injection (someone can inject content in an @-mention), but it reduces the surface area considerably.

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

Don't put API keys in `openclaw.json`. Use 1Password:

```bash
op read "op://Agent-Vault/ANTHROPIC_API_KEY/credential"
```

The scoping is what matters. Create a dedicated vault — "Agent Credentials" or similar — that contains only what the agent needs. Your personal passwords, banking credentials, and everything else stays in vaults the service account can't see.

The Auth0 guide offers a good mental model: "Assume anything the agent can see might eventually leak." Logs, memory files, tool traces, screenshots — any of these could expose a credential. Design for that assumption.

### GitHub tokens: use Apps or fine-grained PATs

GitHub access comes up in almost every agent workflow. Use the most restrictive option available.

**GitHub Apps (preferred):** Install a GitHub App with scoped repository permissions. Installation tokens are short-lived (1 hour) and can be limited to specific repos and permissions:

```bash
# Store the app private key in 1Password
op read "op://Agent-Vault/GitHub App Key/private_key" > /tmp/gh-app-key.pem

# Generate an installation token
gh api -X POST /app/installations/{installation_id}/access_tokens \
  --input <(echo '{"repositories":["my-repo"],"permissions":{"contents":"write","pull_requests":"write"}}')
```

**Fine-grained PATs (acceptable):** If you use personal access tokens, use the [fine-grained version](https://github.com/settings/personal-access-tokens/new). Scope to specific repos, grant minimum permissions, set an expiration (90 days is reasonable).

```bash
export GITHUB_TOKEN=$(op read "op://Agent-Vault/GitHub PAT/credential")
gh pr list --repo my-org/my-repo
```

:::warning Avoid classic PATs
Classic personal access tokens have broad, coarse scopes and no repository restrictions. A leaked classic PAT with `repo` scope exposes every private repository on your account. There's no reason to use them when fine-grained tokens exist.
:::

### The git credential proxy pattern

Anthropic's Claude Code team came up with an approach worth stealing: keep git credentials **outside** the agent's environment entirely. Their system uses a proxy service that sits between the agent and GitHub. The agent authenticates to the proxy with a scoped, limited-purpose credential. The proxy validates the request (correct branch, correct repo, correct operation) and attaches the real authentication before forwarding to GitHub.

The agent never sees the actual git token. Even a fully compromised agent can't exfiltrate it, because it's not in the agent's environment.

This isn't something Attaché implements today, but it's the direction the industry is heading. If you're working with particularly sensitive repositories, it's worth building something similar.

### Rotate the gateway token after upgrading

If you've ever shared a pairing/setup code, it contains your long-lived gateway token (versions ≤ 2026.3.11). After upgrading:

```bash
openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
openclaw gateway restart
```

Re-pair any connected devices afterward.

### 1Password rotation

1Password supports manual rotation of service account tokens via the admin console. You can also set expiration dates when creating tokens.

What 1Password doesn't have: automated scheduled rotation. There's no "regenerate this key every 90 days" feature. That requires something like HashiCorp Vault or AWS Secrets Manager — overkill for most single-operator setups.

**Recommended manual rotation cadence:**

| Credential | How often | Why |
|---|---|---|
| 1Password service account token | Quarterly | Static credential; rotation limits exposure window |
| GitHub App private key | Annually | Installation tokens auto-expire hourly anyway |
| GitHub PAT | Every 90 days | Set expiration at creation as a forcing function |
| LLM API keys (Anthropic, OpenAI) | Quarterly, or on billing anomaly | Watch for unexpected usage spikes |
| Gateway token | After upgrades; quarterly | Pairing codes may have leaked the token |

Since 1Password can't automate this, set calendar reminders. A rotation schedule you forget about isn't a rotation schedule.

## Kill switch

The Auth0 guide recommends having a way to shut everything down quickly. If you suspect compromise:

```bash
openclaw gateway stop
```

That kills all agent sessions immediately. For a more targeted response, you can disable specific channel integrations in `openclaw.json` and restart.

Consider documenting your emergency procedure somewhere you can find it under stress — not buried in a config file you have to SSH into the Mac mini to read.

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

Commit to a timeline and stick to it. Ours:
- **Critical (CVSS ≥ 9.0):** Same day.
- **High (CVSS 7.0–8.9):** Within 48 hours.
- **Medium and below:** Next maintenance window.

### Run the audit command

```bash
openclaw security audit          # Basic config check
openclaw security audit --deep   # Extended analysis
openclaw security audit --json   # For automation
```

This catches common misconfigurations, outdated versions, and known-bad settings. Run it after every config change and at least once a week.
