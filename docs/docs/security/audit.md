---
title: Security Audit
sidebar_position: 5
---

# Security audit procedures

Configuration is only half the job. The other half is checking that reality matches your intentions — and catching it when it doesn't.

## The automated check

OpenClaw has a built-in audit command. Use it:

```bash
openclaw security audit          # Checks config, versions, common mistakes
openclaw security audit --deep   # Extended analysis including log review
openclaw security audit --json   # Machine-readable for piping to monitoring
openclaw security audit --fix    # Auto-fixes safe issues (file permissions, etc.)
```

This catches things like: gateway bound to the wrong interface, exec set to `"full"`, outdated versions with known CVEs, overly permissive channel policies.

Run it after every config change. Run it at least weekly even if nothing changed. Drift happens.

## Reviewing logs by hand

Your gateway logs are the primary audit trail. On a standard Attaché deployment, they're at `~/.openclaw/logs/`.

### What suspicious activity looks like

**Shell wrapper exploits (CVE-2026-22175):**
```bash
grep -i "busybox\|toybox" ~/.openclaw/logs/gateway.err.log
```

**Reverse shell attempts:**
```bash
grep -iE "/dev/tcp|nc -e|mkfifo|ncat |netcat " ~/.openclaw/logs/gateway.err.log
```

**Data exfiltration via curl:**
```bash
grep -iE "curl.*(pastebin|ngrok|webhook\.site|pipedream|requestbin|hookbin|burp)" \
  ~/.openclaw/logs/gateway.err.log
```

**Encoded payloads (common in injection attacks):**
```bash
grep -iE "base64 -d" ~/.openclaw/logs/gateway.err.log
```

**Unexpected credential reads:**
```bash
grep "op read\|op item" ~/.openclaw/logs/gateway.err.log | sort -u
grep "security find-generic-password" ~/.openclaw/logs/gateway.err.log
```

:::warning Watch your log sizes
Gateway logs can grow to tens of gigabytes on active deployments. Searching the entire file with `grep` can take a long time. Use `tail -c 10000000` to check the most recent ~10MB, or set up log rotation.
:::

### Config audit log

OpenClaw keeps a separate log of configuration changes:

```bash
tail -50 ~/.openclaw/logs/config-audit.jsonl
```

Every entry shows what changed, when, and whether anything looked suspicious. All changes should trace back to your intentional `openclaw config set` commands or gateway auto-writes. If you see entries you don't recognize, investigate.

## The IOC checklist

Run through this when you're checking for compromise — either on a schedule or after something feels off.

### SSH and access

```bash
# Every key here should belong to a device you control
cat ~/.ssh/authorized_keys

# Look for keys you didn't add
ls -la ~/.ssh/
```

On a standard Attaché Mac mini, you should see your SSH key and possibly the machine's own key. If there's anything else, find out where it came from.

### Persistence mechanisms

```bash
# Unexpected cron jobs
crontab -l

# LaunchAgents (macOS)
ls ~/Library/LaunchAgents/
ls /Library/LaunchAgents/
ls /Library/LaunchDaemons/
```

You should see `ai.openclaw.gateway.plist` and possibly `ai.openclaw.github-webhooks.plist`. Anything else is worth investigating.

### Network connections

```bash
# Outbound connections to unexpected destinations
lsof -i -nP | grep ESTABLISHED | \
  grep -v "localhost\|127.0.0.1\|::1\|tailscale\|100.64\|100.100"
```

All connections should be to services you recognize: Anthropic API, Slack, Discord, Tailscale nodes, your NAS. Unknown IPs deserve attention.

### Running processes

```bash
ps aux | grep openclaw
```

You should see the gateway and any active agent sessions. Anything unexpected — especially processes you didn't start — warrants a closer look.

## Credential rotation

### When to rotate

| Credential | Routine cadence | Rotate immediately if... |
|---|---|---|
| Gateway token | After upgrades; quarterly | You shared a pairing code insecurely, or suspect token compromise |
| 1Password service account | Quarterly | You suspect the keychain was accessed, or an employee with access leaves |
| LLM API keys | Quarterly | You see unexpected billing spikes or API usage |
| SSH keys | Annually | A device is lost/stolen or decommissioned |

### How to rotate

**Gateway token:**
```bash
openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
openclaw gateway restart
```
Re-pair connected devices after rotating.

**1Password service account:**
Generate a new token in the 1Password admin console. Update the macOS Keychain entry. Restart the gateway.

**API keys:**
Regenerate in the provider's dashboard, update the 1Password item. The agent picks up the new value on its next `op read` — no restart needed.

## Network posture check

Periodically verify that your gateway isn't accessible from places it shouldn't be:

```bash
# This should succeed (via Tailscale):
curl http://<mac-mini-tailscale-ip>:18789/

# This should FAIL (from another machine on your LAN):
curl http://<mac-mini-lan-ip>:18789/
```

If the LAN connection succeeds, your gateway isn't properly bound to loopback. Fix it before doing anything else.

## If you think you've been compromised

1. **Stop the gateway.** `openclaw gateway stop`. This kills all agent sessions immediately.
2. **Rotate everything.** Gateway token, 1Password service account, API keys. Assume any credential the agent had access to is potentially leaked.
3. **Run the IOC checklist** above. Check SSH keys, crontabs, LaunchAgents, network connections, running processes.
4. **Check git history.** `git log` in the workspace for commits you didn't make.
5. **Review memory files.** Look for injected content — instructions that seem to have appeared from nowhere, URLs you don't recognize, base64 strings.
6. **Update and harden.** Upgrade to the latest OpenClaw version. Tighten your exec policy if it was on `"full"`. Restrict channel policies.
7. **Document what happened.** Write down what you found, what you changed, and what you're monitoring going forward. Update your risk register.

The goal isn't to never have an incident. It's to detect it quickly, contain it, and learn from it.
