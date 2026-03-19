---
title: Risk Register
sidebar_position: 4
---

# Risk Register

A structured look at what can go wrong, how likely it is in an Attaché deployment, and what to do about it.

## Agent-level risks

| Risk | Severity | How it happens | What Attaché does about it | What you still need to do |
|---|---|---|---|---|
| **LLM data exposure** | Medium | Code, messages, and file contents get sent to Anthropic/OpenAI as part of prompts | Uses Anthropic's enterprise API with zero-retention policy; data isn't used for training | Verify your provider's data handling terms. If clients or stakeholders care about this, document it explicitly. |
| **Persistent autonomous access** | High | The agent has shell, file system, credential, and messaging access around the clock | Runs on a dedicated Mac mini under an isolated OS user, not your admin account | Switch exec to allowlist mode. Scope your 1Password vaults. Review what tools each agent actually needs. |
| **Prompt injection via messaging** | High | Malicious content in Slack/Discord messages tricks the agent into unintended actions | External web content is wrapped with injection markers; sender allowlists are available | Set `requireMention: true` in shared channels. Use `groupPolicy: "allowlist"`. Run separate personal and team agents. |
| **Link preview exfiltration** | Medium | Agent generates a URL with sensitive data embedded in it; the messaging platform renders a preview, sending the data to an attacker's server via GET request | No built-in defense for this | Be aware this attack exists. It requires no clicks — the preview alone leaks the data. |
| **Supply chain compromise** | High | Malicious ClawHub skills exfiltrate data or install malware (800+ malicious packages identified in 2026) | Policy of never installing third-party skills directly | Enforce this strictly. Inspect and rewrite any code you pull from external sources. |
| **Memory and context poisoning** | Medium | Attacker injects content into agent memory files, influencing future sessions (OWASP ASI06) | Workspace isolation between personal and team agents | Audit memory files periodically. Consider expiring or versioning memory entries. Watch for instructions that seem to have appeared from nowhere. |
| **Credential theft** | High | Compromised agent reads API keys from config, keychain, or 1Password and transmits them to an external server | 1Password with scoped service account tokens; loopback gateway binding | Use scoped vaults. Use exec allowlists. Monitor for unusual outbound traffic. Consider the DM approval pattern for high-value credentials. |
| **Cross-session contamination** | Low | Context from one agent session leaks into another | OpenClaw's session architecture provides isolation | Use separate agent configs for different trust levels. Don't share workspaces between agents handling different clients. |

## Infrastructure-level risks

| Risk | Severity | How it happens | What Attaché does about it | What you still need to do |
|---|---|---|---|---|
| **Gateway exposed to the internet** | Critical | Gateway bound to `0.0.0.0` or forwarded through a public proxy | Loopback binding with Tailscale for remote access | Verify `bind: "loopback"` in your config. Test from another machine on your LAN — the connection should fail. |
| **Gateway token leaked** | High | Pairing code shared insecurely; code contains the long-lived gateway token (CVE, versions ≤ 2026.3.12) | Token auth mode, not trusted-proxy | Upgrade to 2026.3.12+. Rotate your gateway token. Be careful with how you share pairing codes. |
| **SSH brute force** | Low | Password-based SSH authentication allows automated login attempts | Key-only SSH configured by Attaché's setup playbook | Verify `PasswordAuthentication no` in your sshd_config. |
| **Stale software** | Medium | Known CVEs remain unpatched | Ansible-managed config enables reproducible updates | Patch within 48 hours for high/critical. Run `openclaw security audit` weekly. |

## How recent CVEs map to Attaché deployments

Not every CVE matters equally. Here's how the recent disclosures apply to a standard Attaché setup:

| CVE | Severity | Relevant to Attaché? | Reasoning |
|---|---|---|---|
| **CVE-2026-25253** — Auth token theft via crafted URL | High (8.8) | Patched | Attaché ships versions past v2026.1.29 |
| **CVE-2026-22175** — Exec allowlist bypass via busybox/toybox | High (7.1) | Only if on allowlist mode with a vulnerable version | Upgrade to v2026.2.23+. Ironically, deployments using `exec.security: "full"` aren't affected (there's no allowlist to bypass). |
| **Origin bypass** — WebSocket hijacking via trusted-proxy mode | Critical | **Not applicable** | Attaché uses `auth.mode: "token"`. The attack requires `trusted-proxy`. |
| **Exec glob bypass** — Wildcard `?` crosses directory boundaries | Moderate | Only with glob-based allowlist patterns | Upgrade to v2026.3.11+. Use explicit paths in allowlists, not wildcards. |
| **Credential in pairing** — Setup codes contain long-lived tokens | Moderate | **Yes** | Upgrade to v2026.3.12+. Rotate your gateway token if you've ever shared a setup code. |
| **DM-to-group auth bypass** — DM-paired senders treated as authorized in groups | Low | **No** | This is specific to LINE. Attaché uses Discord and Slack. |

:::info Context matters
These severity ratings assume a standard Attaché deployment: loopback binding, Tailscale, token auth, dedicated hardware. If your setup deviates from those defaults, your exposure may be different.
:::

## Risks you have to accept

Some things about AI agent deployments can't be fully mitigated with configuration. Documenting them honestly is better than pretending they don't exist.

**Your data goes to LLM providers.** Even with zero-retention agreements, your code and conversations travel to Anthropic or OpenAI's servers for inference. This is the cost of using hosted models. If that's unacceptable for a particular client or project, the agent can't work on that project. There's no halfway measure.

**Prompt injection is unsolved.** No filter, no wrapper, no model training has eliminated it. Defense in depth (allowlists, isolation, monitoring) reduces the likelihood and limits the damage, but a sufficiently clever injection can still get through. The industry hasn't cracked this one yet — including Anthropic, OpenAI, and Google.

**Useful agents need real access.** An agent that can't read files, run commands, or call APIs isn't very helpful. But any capability you give the agent is a capability an attacker inherits if they compromise it. You're always trading security for utility. The goal is making that tradeoff consciously, not accidentally.

These aren't reasons to avoid agent deployments. They're reasons to go in with open eyes and appropriate controls.
