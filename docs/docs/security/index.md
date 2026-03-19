---
title: Security Overview
sidebar_position: 1
---

# Security

Attache gives your AI agent standing access to your shell, file system, credentials, and messaging channels. That's what makes it useful. It's also what makes it dangerous if you don't think carefully about the security model.

This section documents the risks, what Attache does about them by default, and where gaps remain.

## How the trust model works

OpenClaw is built around a **single-operator gateway**. One person, one gateway, one or more agents. There's no multi-tenant role system, no fine-grained RBAC. The trust boundary is simple:

- **You are the trust root.** Whoever holds the gateway token controls everything.
- **Your agents have your permissions.** If an agent can run shell commands, it can do anything your OS user can do. The only limits are the tool restrictions you configure.
- **Everyone who can talk to an agent shares the same authority.** Put your agent in a Slack channel with ten people, and all ten can trigger shell commands, file reads, and credential access. There's no per-sender scoping within a single agent. (Attache's [Multiplayer](./multiplayer.md) patterns address this.)
- **External content gets marked as untrusted.** Web fetches, search results, and scraped pages are wrapped with injection guards. Messages from authorized senders on your channels are treated as operator instructions.

Auth0 put it well in their [OpenClaw security guide](https://auth0.com/blog/five-step-guide-securing-moltbot-ai-agent/): "Stop treating agents like chat toys and start treating them like junior employees with root access."

:::info Upstream docs
OpenClaw maintains its own security documentation at [docs.openclaw.ai/gateway/security](https://docs.openclaw.ai/gateway/security). Attache builds on those primitives with opinionated defaults and additional hardening.
:::

## What Attache configures by default

A fresh Attache deployment ships with these decisions already made:

| Default | What it prevents |
|---|---|
| **Dedicated Mac mini** | Agent runs on separate hardware. A compromise doesn't touch your primary workstation. |
| **Dedicated `openclaw` OS user** | Agent process runs under a restricted account, not your admin user. |
| **Key-only SSH** | Attache's setup playbook disables password authentication. Brute-force isn't viable. |
| **Tailscale for remote access** | Gateway never touches the public internet. Every connection requires authenticated tailnet membership. |
| **Loopback gateway binding** | Gateway listens on `127.0.0.1` only. Not reachable from LAN. Traffic goes through Tailscale or stays on localhost. |
| **Token-based auth** | Every connection presents a token. Attache does not use `trusted-proxy` mode, which has been the subject of a [critical advisory](#the-cve-and-advisory-situation). |
| **1Password for secrets** | Credentials live in scoped 1Password vaults, not plaintext config files. |
| **Ansible-managed setup** | Infrastructure is declarative. Drift is detectable. Re-running a playbook converges back to a known-good configuration. |

Most OpenClaw tutorials have you running the gateway on your laptop, exposed on all interfaces, with full exec permissions. Attache exists because that's a terrible idea.

## The threat landscape

### Prompt injection

An attacker embeds instructions in something the agent reads — a Slack message, a web page, a code comment, an email body — and the agent follows those instructions as if they came from you. With tool access, that means shell commands, file reads, credential access, and data exfiltration.

No current defense fully eliminates prompt injection. The `EXTERNAL_UNTRUSTED_CONTENT` wrappers help with content the agent fetches from the web. They don't help when the injection comes through a direct message on an authorized channel. Defense in depth — exec allowlists, scoped credentials, channel policies, monitoring — reduces the likelihood and limits the blast radius, but a sufficiently clever injection can still succeed.

The OWASP Top 10 for Agentic Applications (2026) lists this as **ASI01 — Agent Goal Hijack**, their top concern. The [Aikido.dev breakdown](https://www.aikido.dev/blog/owasp-top-10-agentic-applications) covers real examples: poisoned emails, malicious calendar invites, injected GitHub issues.

### Supply chain attacks

OpenClaw has a plugin ecosystem (ClawHub) where anyone can publish skills. In early 2026, the ClawHavoc campaign ([Koi Security report](https://koisecurity.com/blog/clawhub-malware-campaign-2026)) identified over 800 malicious packages, some delivering the Atomic macOS Stealer. OWASP calls this **ASI04 — Agentic Supply Chain Vulnerabilities**.

Attache's policy: never install third-party skills. Read the code, understand it, write your own.

### Credential exposure

Your agent needs API keys, tokens, and passwords to do useful work. Any credential the agent can read, a compromised agent can exfiltrate. Attache reduces the blast radius with scoped vaults, short-lived tokens, and the [secrets proxy daemon](./hardening.md#secrets-proxy-daemon) pattern — but the fundamental tension between access and exposure remains.

### The CVE and advisory situation

OpenClaw is young software under active security scrutiny. The disclosure rate has been high:

- **CVE-2026-25253** (CVSS 8.8) — Clicking a crafted URL sends your auth tokens to an attacker. No other interaction needed. Patched in v2026.1.29.
- **CVE-2026-22175** (CVSS 7.1) — `busybox sh -c` bypasses the exec allowlist. Patched in v2026.2.23.
- **Advisory: Origin bypass** (Critical) — Malicious web pages can open WebSocket connections through reverse proxies and get full operator access. Patched in v2026.3.11.
- **Advisory: Exec glob bypass** (Moderate) — The `?` wildcard in allowlist patterns crosses directory boundaries. Patched in v2026.3.11.
- **Advisory: Credential exposure in pairing** (Moderate) — QR codes for device pairing contain your actual gateway token, not a temporary one. Affected versions before v2026.3.12. Patched in v2026.3.12.

China's CNCERT [warned about OpenClaw's weak defaults](https://thehackernews.com/2026/03/openclaw-ai-agent-flaws-could-enable.html) and restricted its use on government systems.

:::warning Patch fast
With this disclosure rate, you need a commitment to fast patching. Attache's recommendation: within 48 hours for high severity, same day for critical. See [Hardening](./hardening.md#version-management) for details.
:::

### Exposed instances

Early [Censys](https://censys.io) and [Bitsight](https://www.bitsight.com) scans found over 30,000 OpenClaw instances exposed to the internet without authentication. Later scans pushed that number to 135,000-220,000+. The growth rate alone is a compelling argument for loopback binding — which is why Attache defaults to it.

## Industry frameworks

**OWASP Top 10 for Agentic Applications (2026)** — The ten highest-impact risks for autonomous AI systems. Published December 2025, developed with 100+ industry contributors. The categories map closely to OpenClaw's architecture: goal hijack (prompt injection), tool misuse, privilege abuse, supply chain, unexpected code execution, memory poisoning, inter-agent communication, cascading failures, trust exploitation, and monitoring gaps.

**MITRE ATLAS** — Like MITRE ATT&CK but for AI systems. Updated October 2025 with 14 new agent-specific techniques developed with Zenity Labs. Covers the full attack lifecycle from reconnaissance through exfiltration. Useful for building a formal threat model.

## Related projects

**[OpenClaw PRISM](https://arxiv.org/abs/2603.11853)** (arXiv, March 2026) — Academic paper by Frank Li (UNSW Sydney) describing a zero-fork runtime security layer for OpenClaw. Covers lifecycle-wide interception (10 hooks), hybrid heuristic-plus-LLM scanning, session-level risk accumulation with TTL-based decay, outbound secret pattern scanning, and tamper-evident audit logging. No public source code yet. Attache's [roadmap](#roadmap) draws on PRISM's design as a validated blueprint.

**[ClawGuard](https://github.com/newtro/ClawGuard)** — Open-source security middleware for OpenClaw skills. Skills declare what files, domains, commands, and env vars they need in a `permissions.json`; ClawGuard enforces those declarations at runtime. Includes a global kill switch and tamper-evident audit logs. If you run third-party skills (we don't recommend it), ClawGuard adds a meaningful enforcement layer.

**[SlowMist Security Practice Guide](https://github.com/slowmist/openclaw-security-practice-guide)** — Agentic Zero-Trust Architecture from the blockchain security firm SlowMist. Injects security rules into the agent's system prompt with three-tier defense: pre-action blacklists, in-action permission checks, post-action nightly audits. Prompt-level enforcement has inherent limitations against prompt injection, but the audit structure is worth studying.

**[Auth0: Securing OpenClaw](https://auth0.com/blog/five-step-guide-securing-moltbot-ai-agent/)** — Practical five-step guide covering sandboxing, allowlists, credential scoping, auditing, and group chat separation.

**[Microsoft: Running OpenClaw Safely](https://www.microsoft.com/en-us/security/blog/2026/02/19/running-openclaw-safely-identity-isolation-runtime-risk/)** — Identity, isolation, and runtime risk through the lens of Microsoft Defender XDR. Includes a minimum safe operating posture checklist.

**[Anthropic: Claude Code Sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)** — OS-level sandboxing using bubblewrap (Linux) and seatbelt (macOS) for filesystem and network isolation. Open-sourced at [github.com/anthropic-experimental/sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime).

## Roadmap

Attache's security controls today cover gateway hardening, exec allowlists, channel policies, credential scoping, and the secrets proxy daemon. Here's what's next:

**Bloom filter credential scanning** — Build a bloom filter from 1Password vault entries and scan outbound commands for potential credential exfiltration. The target is sub-5ms per command, though we haven't benchmarked at scale yet. Catches the most dangerous exfiltration pattern: an agent embedding an API key in a curl command or URL.

**Tiered risk scoring with time-decay** — Assign base risk scores to action categories. Tier 1 (read-only) runs freely. Tier 2 (reversible writes) pre-approved via allowlist. Tier 3 (external side effects) approved once per session via DM. Tier 4 (destructive/credential operations) always requires human approval. Recently-approved actions decay to lower risk scores; stale approvals climb back up.

**Supervisor agent evaluation** — A secondary agent in a separate context evaluates risky operations before execution. Runs a fast heuristic check first; only escalates to LLM-based evaluation for ambiguous cases. Inspired by PRISM's hybrid scanning pipeline.

**OS-level sandboxing** — Integration with Anthropic's open-source sandbox runtime for filesystem and network isolation at the kernel level. The long-term goal: agents work freely within a sandbox that physically prevents exfiltration, regardless of prompt injection.

## What's in this section

- **[Hardening](./hardening.md)** — Tuning Attache's defaults: gateway, exec, channels, credentials, network egress, and patching.
- **[Multiplayer](./multiplayer.md)** — How Attache makes team and multi-agent access safe: personal/team agent split, DM approvals, memory isolation.
- **[Risk Register](./risk-register.md)** — Each risk, how Attache addresses it, and where you need to take action yourself.
- **[Audit](./audit.md)** — Verifying your security posture, detecting compromise, and prompt injection signatures in logs.
- **[LLM Provider Data Handling](./llm-providers.md)** — What each provider does with your data, how to choose the right tier, and how this compares to tools you already trust.
