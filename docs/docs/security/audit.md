---
title: Security Audit
sidebar_position: 5
---

# Security audit procedures

Configuration is only half the job. The other half is checking that reality matches your intentions — and catching it when it doesn't.

## The automated check

OpenClaw has a built-in audit command that Attache recommends running regularly:

```bash
openclaw security audit          # Checks config, versions, common mistakes
openclaw security audit --deep   # Extended analysis including log review
openclaw security audit --json   # Machine-readable for piping to monitoring
openclaw security audit --fix    # Auto-fixes safe issues (file permissions, etc.)
```

This catches: gateway bound to the wrong interface, exec set to `"full"`, outdated versions with known CVEs, overly permissive channel policies.

Run it after every config change. Run it at least weekly even if nothing changed. Drift happens.

## Reviewing logs

Your gateway logs are the primary audit trail. On a standard Attache deployment, they're at `~/.openclaw/logs/`.

For log rotation and retention policy, see [Hardening: log retention](./hardening.md#log-retention-and-rotation).

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

## Prompt injection detection

A successful prompt injection doesn't look like a reverse shell attempt. It looks like the agent doing something subtly wrong — sending a message it shouldn't, reading a file that's out of scope, making an API call with unexpected parameters. These are harder to spot but have distinct signatures.

### What a hijacked agent looks like in logs

**Sudden context shift:** The agent was working on task A, then without a new user message, starts doing something unrelated. Look for exec commands or API calls that don't match the current conversation topic.

```bash
# Commands that don't match the agent's usual patterns
# Compare against your baseline of normal agent behavior
diff <(grep "exec" ~/.openclaw/logs/gateway.err.log | awk '{print $NF}' | sort -u) \
     <(cat ~/.openclaw/exec-baseline.txt)
```

**Exfiltration disguised as normal operations:** The agent constructs a URL with data embedded in query parameters, path segments, or subdomains. The data goes out as a GET request — possibly via a link preview, a webhook call, or a web fetch.

```bash
# URLs with suspiciously long query strings or unusual domains
grep -iE "https?://[^ ]*\?(.*=){3,}" ~/.openclaw/logs/gateway.err.log
grep -iE "https?://[a-z0-9]{20,}\." ~/.openclaw/logs/gateway.err.log
```

**Memory file manipulation:** The agent writes to its own memory files with content that looks like instructions rather than notes. This is the setup phase of a persistent injection — the payload activates in a future session.

```bash
# Check for instruction-like content in recent memory writes
grep -l "you must\|always do\|never tell\|ignore previous\|disregard" \
  ~/workspace/MEMORY.md ~/workspace/.claude/memory/*.md 2>/dev/null
```

**Credential access outside normal patterns:** The agent requests a credential it doesn't usually need, or accesses credentials at unusual times. The [secrets proxy daemon](./hardening.md#secrets-proxy-daemon) logs make this easy to audit.

```bash
# If using the secrets proxy, check for unusual access patterns
grep "status=denied\|status=approved_via_dm" /var/log/attache-secrets-proxy.log
```

### Building a baseline

The detection patterns above are most useful when you know what "normal" looks like. Spend a week logging your agent's exec patterns, credential access, and API calls during normal operation. Save that baseline. Deviations from it are your signal.

## Monitoring and alerting

Manual log review catches problems after the fact. Automated monitoring catches them faster.

### Lightweight alerting with launchd

For a single-operator setup, a periodic check script is often enough:

```bash title="~/.openclaw/scripts/security-monitor.sh"
#!/bin/bash
# Run every 15 minutes via launchd

LOG=~/.openclaw/logs/gateway.err.log
ALERT_FILE=/tmp/openclaw-security-alerts

# Check for known bad patterns
HITS=$(grep -ciE "busybox|toybox|/dev/tcp|nc -e|base64 -d|mkfifo" "$LOG" 2>/dev/null)

if [ "$HITS" -gt 0 ]; then
  echo "[$(date)] $HITS suspicious patterns found in gateway logs" >> "$ALERT_FILE"
  # Send alert via your preferred channel
  openclaw message --channel "DM:you" \
    "Security alert: $HITS suspicious patterns found in gateway.err.log. Run the IOC checklist."
fi

# Check for exec commands outside the baseline
NEW_CMDS=$(grep "exec" "$LOG" | awk '{print $NF}' | sort -u | \
  comm -23 - ~/.openclaw/exec-baseline.txt 2>/dev/null | wc -l)

if [ "$NEW_CMDS" -gt 0 ]; then
  echo "[$(date)] $NEW_CMDS new exec patterns detected" >> "$ALERT_FILE"
fi
```

### SIEM integration

If you run a log aggregator (Datadog, Grafana Loki, ELK), ship gateway logs there and set up alerts on:

- Any exec command containing `busybox`, `toybox`, `/dev/tcp`, `nc -e`, or `mkfifo`
- More than 5 unique `op read` calls in a 5-minute window
- Any outbound connection to an IP not in your allowlist (requires [network egress controls](./hardening.md#network-egress-controls))
- Config audit log entries that don't match your `openclaw config set` commands

The `openclaw security audit --json` output can be polled by your monitoring system to check for configuration drift.

## The IOC checklist

Run through this when you're checking for compromise — either on a schedule or after something feels off.

### SSH and access

```bash
# Every key here should belong to a device you control
cat ~/.ssh/authorized_keys

# Look for keys you didn't add
ls -la ~/.ssh/
```

On a standard Attache Mac mini, you should see your SSH key and possibly the machine's own key. Anything else — find out where it came from.

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

| Credential                | Routine cadence           | Rotate immediately if...                                                 |
| ------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| Gateway token             | After upgrades; quarterly | You shared a pairing code insecurely, or suspect token compromise        |
| 1Password service account | Quarterly                 | You suspect the keychain was accessed, or an employee with access leaves |
| LLM API keys              | Quarterly                 | You see unexpected billing spikes or API usage                           |
| SSH keys                  | Annually                  | A device is lost/stolen or decommissioned                                |

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
7. **Recover from Ansible.** Re-run the setup playbook to converge back to a known-good configuration. See [Hardening: backup and recovery](./hardening.md#backup-and-recovery).
8. **Document what happened.** Write down what you found, what you changed, and what you're monitoring going forward. Update your risk register.
