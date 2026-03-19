---
title: Security Overview
sidebar_position: 1
---

# Security

Attaché gives your AI agent standing access to your shell, file system, credentials, and messaging channels. That's what makes it useful. It's also what makes it dangerous if you don't think carefully about the security model.

This section is our attempt to be honest about the risks — what they are, what we do about them, and where the gaps remain.

## How the trust model works

OpenClaw is built around a **single-operator gateway**. One person, one gateway, one or more agents. There's no multi-tenant role system, no fine-grained RBAC. The trust boundary is simple:

- **You are the trust root.** Whoever holds the gateway token controls everything. Full stop.
- **Your agents have your permissions.** If an agent can run shell commands, it can do anything your OS user can do. The only limits are the tool restrictions you configure.
- **Everyone who can talk to an agent shares the same authority.** Put your agent in a Slack channel with ten people, and all ten of them can trigger shell commands, file reads, and credential access. There's no per-sender scoping within a single agent. (We cover safe patterns for this in [Shared Access](./shared-access.md).)
- **External content gets marked as untrusted.** Web fetches, search results, and scraped pages are wrapped with injection guards. But messages from authorized senders on your channels? Those are treated as operator instructions. The system trusts them.

Auth0 put it well in their [OpenClaw security guide](https://auth0.com/blog/five-step-guide-securing-moltbot-ai-agent/): "Stop treating agents like chat toys and start treating them like junior employees with root access — helpful, fast, occasionally wrong, and absolutely not to be given unrestricted access without guardrails."

:::info Upstream docs
OpenClaw maintains its own security documentation at [docs.openclaw.ai/gateway/security](https://docs.openclaw.ai/gateway/security). We build on top of those primitives with opinionated defaults and additional hardening guidance.
:::

## What Attaché does differently

Most OpenClaw tutorials have you running the gateway on your laptop, exposed on all interfaces, with full exec permissions. Attaché takes a different approach:

| Decision | Why it matters |
|---|---|
| **Dedicated Mac mini** | The agent runs on separate hardware. If something goes wrong, your primary workstation isn't affected. |
| **Dedicated `openclaw` OS user** | The agent process doesn't run under your admin account. It has limited access to system resources by design. |
| **Key-only SSH** | No password authentication means brute-force attacks aren't viable. |
| **Tailscale for remote access** | The gateway never touches the public internet. Every connection requires authenticated tailnet membership. |
| **Loopback gateway binding** | Even on the local network, the gateway isn't directly reachable. Traffic goes through Tailscale or stays on localhost. |
| **Token-based auth** | Every connection presents a token. We don't use `trusted-proxy` mode, which has been the subject of a critical CVE. |
| **1Password for secrets** | Credentials live in scoped 1Password vaults, not scattered across plaintext config files. |
| **Ansible-managed setup** | Infrastructure is declarative. You can tell when something has drifted from the expected state. Re-running a playbook converges back to a known-good configuration. |

## The threat landscape

AI agents face threats that most software doesn't. Here's what actually keeps us up at night:

### Prompt injection

This is the big one. An attacker embeds instructions in something the agent reads — a Slack message, a web page, a code comment, an email body — and the agent follows those instructions as if they came from you. With tool access, that means shell commands, file reads, credential access, and data exfiltration.

Nobody has solved this. Not OpenAI, not Anthropic, not Google. The `EXTERNAL_UNTRUSTED_CONTENT` wrappers help with content the agent fetches from the web. They don't help when the injection comes through a direct message on an authorized channel.

The OWASP Top 10 for Agentic Applications (2026) lists this as **ASI01 — Agent Goal Hijack**, and it's their number one concern. The [Aikido.dev breakdown](https://www.aikido.dev/blog/owasp-top-10-agentic-applications) covers real examples: poisoned emails, malicious calendar invites, injected GitHub issues.

### Supply chain attacks

OpenClaw has a plugin ecosystem (ClawHub) where anyone can publish skills. In early 2026, researchers found over 800 malicious packages there, some delivering the Atomic macOS Stealer. OWASP calls this **ASI04 — Agentic Supply Chain Vulnerabilities**.

Attaché's policy: never install third-party skills. Read the code, understand it, write your own. This is one of those areas where convenience isn't worth the risk.

### Credential exposure

Your agent needs API keys, tokens, and passwords to do anything useful. But any credential the agent can read, a compromised agent can exfiltrate. This is an inherent tension — there's no configuration that makes it go away entirely. You can reduce the blast radius (scoped vaults, short-lived tokens, isolated environments), but the fundamental problem remains.

### The CVE situation

OpenClaw is young software under active security scrutiny. The disclosure rate has been high:

- **CVE-2026-25253** (CVSS 8.8) — Clicking a crafted URL sends your auth tokens to an attacker. No other interaction needed. Patched in v2026.1.29.
- **CVE-2026-22175** (CVSS 7.1) — `busybox sh -c` bypasses the exec allowlist. Patched in v2026.2.23.
- **Origin bypass** (Critical) — Malicious web pages can open WebSocket connections through reverse proxies and get full operator access. Patched in v2026.3.11.
- **Exec glob bypass** (Moderate) — The `?` wildcard in allowlist patterns crosses directory boundaries. Patched in v2026.3.11.
- **Credential exposure in pairing** (Moderate) — QR codes for device pairing contain your actual gateway token, not a temporary one. Patched in v2026.3.12.

China's CNCERT has [warned about OpenClaw's weak defaults](https://thehackernews.com/2026/03/openclaw-ai-agent-flaws-could-enable.html) and restricted its use on government systems. That's a signal worth paying attention to.

:::warning Patch fast
With this rate of disclosure, you need a commitment to patching quickly. Our recommendation: within 48 hours for anything rated high or above. For critical severity, same day. See [Hardening](./hardening.md) for details.
:::

## Industry frameworks worth knowing about

You don't have to figure this out from scratch. Two frameworks are directly relevant:

**OWASP Top 10 for Agentic Applications (2026)** — Covers the ten highest-impact risks for autonomous AI systems. Published December 2025, developed with 100+ industry contributors. The categories map almost perfectly to OpenClaw's architecture: goal hijack (prompt injection), tool misuse, privilege abuse, supply chain, unexpected code execution, memory poisoning, inter-agent communication, cascading failures, trust exploitation, and monitoring gaps.

**MITRE ATLAS** — Like MITRE ATT&CK but for AI systems. Updated in October 2025 with 14 new agent-specific techniques developed with Zenity Labs. Covers the full attack lifecycle from reconnaissance through exfiltration. Useful if you're building a formal threat model.

## Prior art and related projects

Attaché isn't the only team thinking about OpenClaw security. Several projects and publications are worth knowing about:

**[OpenClaw PRISM](https://arxiv.org/abs/2603.11853)** (arXiv, March 2026) — An academic paper describing a zero-fork runtime security layer for OpenClaw. Covers lifecycle-wide interception (10 hooks), hybrid heuristic-plus-LLM scanning, session-level risk accumulation with TTL-based decay, outbound secret pattern scanning, and tamper-evident audit logging. The architecture is well-designed but as of this writing, no public source code is available. We reference PRISM's design in our [roadmap](#roadmap) as a validated blueprint.

**[ClawGuard](https://github.com/newtro/ClawGuard)** — Open-source security middleware for OpenClaw skills. Takes a permission-manifest approach: skills declare what files, domains, commands, and env vars they need in a `permissions.json`, and ClawGuard enforces those declarations at runtime. Includes a global kill switch and tamper-evident audit logs. Complementary to runtime behavior analysis.

**[SlowMist Security Practice Guide](https://github.com/slowmist/openclaw-security-practice-guide)** — An "Agentic Zero-Trust Architecture" from the blockchain security firm SlowMist. Injects security rules directly into the agent's system prompt. Three-tier defense: pre-action blacklists, in-action permission checks, post-action nightly audits. Creative approach, though prompt-level enforcement has inherent limitations against prompt injection.

**[Auth0: Securing OpenClaw](https://auth0.com/blog/five-step-guide-securing-moltbot-ai-agent/)** — A practical five-step guide covering sandboxing, allowlists, credential scoping, auditing, and group chat separation. Good introduction for teams new to agent security.

**[Microsoft: Running OpenClaw Safely](https://www.microsoft.com/en-us/security/blog/2026/02/19/running-openclaw-safely-identity-isolation-runtime-risk/)** — Covers identity, isolation, and runtime risk through the lens of Microsoft Defender XDR. Includes a "minimum safe operating posture" checklist.

**[Anthropic: Claude Code Sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)** — Not OpenClaw-specific, but directly relevant. Documents OS-level sandboxing using bubblewrap (Linux) and seatbelt (macOS) for filesystem and network isolation. Open-sourced at [github.com/anthropic-experimental/sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime).

## Roadmap

Attaché's security controls today cover gateway hardening, exec allowlists, channel policies, and credential scoping. Here's where we're heading:

**Bloom filter credential scanning** — Build a bloom filter from 1Password vault entries and scan outbound commands for potential credential exfiltration. Nearly zero performance overhead (1-5ms per command). Catches the most dangerous exfiltration pattern: an agent embedding an API key or token in a curl command or URL.

**Tiered risk scoring with time-decay** — Assign base risk scores to action categories. Tier 1 (read-only) runs freely. Tier 2 (reversible writes) pre-approved via allowlist. Tier 3 (external side effects) approved once per session via DM. Tier 4 (destructive/credential operations) always requires human approval. Recently-approved actions decay to lower risk scores; stale approvals climb back up.

**Supervisor agent evaluation** — A secondary agent in a separate context that evaluates risky operations before execution. Runs a fast heuristic check first; only escalates to LLM-based evaluation for ambiguous cases. Inspired by PRISM's hybrid scanning pipeline.

**OS-level sandboxing** — Integration with Anthropic's open-source sandbox runtime for filesystem and network isolation at the kernel level. The long-term goal: agents work freely within a sandbox that physically prevents exfiltration, regardless of prompt injection.

## What's in this section

- **[Hardening](./hardening.md)** — The configuration changes that matter most: gateway, exec, channels, credentials, and patching.
- **[Shared Access](./shared-access.md)** — How to let your team interact with agents without giving everyone the keys to the kingdom.
- **[Risk Register](./risk-register.md)** — A structured look at each risk, how Attaché addresses it, and where you need to take action yourself.
- **[Audit](./audit.md)** — How to verify your security posture and check for signs of compromise.
