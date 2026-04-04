---
title: Security Overview
sidebar_position: 1
---

# Security

Evie Platform gives your AI agent standing access to your shell, file system, credentials, and messaging channels. That's what makes it useful. It's also what makes it dangerous if you don't think carefully about the security model.

This section documents the risks, what Evie Platform does about them by default, and where gaps remain.

## How the trust model works

OpenClaw is built around a **single-operator gateway**. One person, one gateway, one or more agents. There's no multi-tenant role system, no fine-grained RBAC. The trust boundary is simple:

- **You are the trust root.** Whoever holds the gateway token controls everything.
- **Your agents have your permissions.** If an agent can run shell commands, it can do anything your OS user can do. The only limits are the tool restrictions you configure.
- **Everyone who can talk to an agent shares the same authority.** Put your agent in a Slack channel with ten people, and all ten can trigger shell commands, file reads, and credential access. There's no per-sender scoping within a single agent. (Evie Platform's [Multiplayer](./multiplayer.md) patterns address this.)
- **External content gets marked as untrusted.** Web fetches, search results, and scraped pages are wrapped with injection guards. Messages from authorized senders on your channels are treated as operator instructions.

Auth0 put it well in their [OpenClaw security guide](https://auth0.com/blog/five-step-guide-securing-moltbot-ai-agent/): "Stop treating agents like chat toys and start treating them like junior employees with root access."

:::info Upstream docs
OpenClaw maintains its own security documentation at [docs.openclaw.ai/gateway/security](https://docs.openclaw.ai/gateway/security). Evie Platform builds on those primitives with opinionated defaults and additional hardening.
:::

## What Evie Platform configures by default

A fresh Evie Platform deployment ships with these decisions already made:

| Default                          | What it prevents                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dedicated Mac mini**           | Agent runs on separate hardware. A compromise doesn't touch your primary workstation.                                                                                     |
| **Dedicated `openclaw` OS user** | Agent process runs under a restricted account, not your admin user.                                                                                                       |
| **Key-only SSH**                 | Evie Platform's setup playbook disables password authentication. Brute-force isn't viable.                                                                                |
| **Tailscale for remote access**  | Gateway never touches the public internet. Every connection requires authenticated tailnet membership.                                                                    |
| **Loopback gateway binding**     | Gateway listens on `127.0.0.1` only. Not reachable from LAN. Traffic goes through Tailscale or stays on localhost.                                                        |
| **Token-based auth**             | Every connection presents a token. Evie Platform does not use `trusted-proxy` mode, which has been the subject of a [critical advisory](#the-cve-and-advisory-situation). |
| **1Password for secrets**        | Credentials live in scoped 1Password vaults, not plaintext config files.                                                                                                  |
| **Ansible-managed setup**        | Infrastructure is declarative. Drift is detectable. Re-running a playbook converges back to a known-good configuration.                                                   |

Most OpenClaw tutorials have you running the gateway on your laptop, exposed on all interfaces, with full exec permissions. Evie Platform exists because that's a terrible idea.

## Progressive trust

> "First you get my calendar, then you can read my email, then you can draft emails, then you can send emails, then why don't you go to all my meetings for me?" -- Claire Vo, Lenny's Podcast

Trust is progressive, exactly how you'd onboard a human employee. You don't give the agent the keys on day one. You build confidence incrementally, adjusted for the stakes of each action.

Even on day one, the agent can draft emails freely. It just can't send them without approval. Over time, risk scoring kicks in: sending an internal email to a colleague is less risky than emailing your largest customer's CEO. The second case should always require explicit approval.

Evie Platform encodes this progression into a **four-tier trust model**:

| Tier                                 | Policy                                        | Examples                                                                                         |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Tier 1: Run freely**               | Read-only, no side effects                    | Reading email, checking calendar, searching Slack, browsing repos, fetching web pages            |
| **Tier 2: Pre-approved**             | Write operations within reversible boundaries | Creating git branches, committing code, opening PRs, drafting emails                             |
| **Tier 3: Approve once per session** | External side effects, used regularly         | Sending email, posting to Slack channels, triggering deployments                                 |
| **Tier 4: Always approve**           | High-consequence, irreversible operations     | Deleting data, modifying SSH config, accessing production DB credentials, financial transactions |

Tiers 1 and 2 cover the vast majority of daily agent activity. The agent only blocks on tier 3 and 4 operations, which come up far less frequently. See [Hardening: the four-tier model](./hardening.md#the-four-tier-model) for implementation details.

## Agent-blind credential injection

The most dangerous thing an agent can do is exfiltrate your credentials. Evie Platform's design principle: **the agent never sees secrets**. Credentials are injected at the tool layer, invisible to the LLM.

The [secrets proxy daemon](./hardening.md#secrets-proxy-daemon) sits between the agent and the credential store (1Password). When the agent needs an API key:

1. It requests the credential through the proxy, not directly
2. The proxy checks a per-secret allowlist
3. For sensitive secrets, the proxy sends you a DM (Discord/Slack) asking for approval
4. You approve or deny from your phone
5. The credential gets injected at the tool layer, never exposed to the language model

There is no direct interaction between the requesting agent and the credential itself. Even a fully compromised agent can only access secrets the proxy's allowlist permits. The proxy also runs **leak detection** (regex + entropy scanning) on every outbound message to catch accidental credential exposure.

import ImageLightbox from '@site/src/components/ImageLightbox';

<ImageLightbox src="/img/evie-security-L1.png" alt="Security Architecture" />

## The threat landscape

### Prompt injection

An attacker embeds instructions in something the agent reads — a Slack message, a web page, a code comment, an email body — and the agent follows those instructions as if they came from you. With tool access, that means shell commands, file reads, credential access, and data exfiltration.

No current defense fully eliminates prompt injection. The `EXTERNAL_UNTRUSTED_CONTENT` wrappers help with content the agent fetches from the web. They don't help when the injection comes through a direct message on an authorized channel. Defense in depth — exec allowlists, scoped credentials, channel policies, monitoring — reduces the likelihood and limits the blast radius, but a sufficiently clever injection can still succeed.

The OWASP Top 10 for Agentic Applications (2026) lists this as **ASI01 — Agent Goal Hijack**, their top concern. The [Aikido.dev breakdown](https://www.aikido.dev/blog/owasp-top-10-agentic-applications) covers real examples: poisoned emails, malicious calendar invites, injected GitHub issues.

### Supply chain attacks

OpenClaw has a plugin ecosystem (ClawHub) where anyone can publish skills. In early 2026, the ClawHavoc campaign ([Koi Security report](https://koisecurity.com/blog/clawhub-malware-campaign-2026)) identified over 800 malicious packages, some delivering the Atomic macOS Stealer. OWASP calls this **ASI04 — Agentic Supply Chain Vulnerabilities**.

Evie Platform's policy: never install third-party skills. Read the code, understand it, write your own.

### Credential exposure

Your agent needs API keys, tokens, and passwords to do useful work. Any credential the agent can read, a compromised agent can exfiltrate. Evie Platform reduces the blast radius with scoped vaults, short-lived tokens, and the [secrets proxy daemon](./hardening.md#secrets-proxy-daemon) pattern — but the fundamental tension between access and exposure remains.

### The CVE and advisory situation

OpenClaw is young software under active security scrutiny. The disclosure rate has been high:

- **CVE-2026-25253** (CVSS 8.8) — Clicking a crafted URL sends your auth tokens to an attacker. No other interaction needed. Patched in v2026.1.29.
- **CVE-2026-22175** (CVSS 7.1) — `busybox sh -c` bypasses the exec allowlist. Patched in v2026.2.23.
- **Advisory: Origin bypass** (Critical) — Malicious web pages can open WebSocket connections through reverse proxies and get full operator access. Patched in v2026.3.11.
- **Advisory: Exec glob bypass** (Moderate) — The `?` wildcard in allowlist patterns crosses directory boundaries. Patched in v2026.3.11.
- **Advisory: Credential exposure in pairing** (Moderate) — QR codes for device pairing contain your actual gateway token, not a temporary one. Affected versions before v2026.3.12. Patched in v2026.3.12.

China's CNCERT [warned about OpenClaw's weak defaults](https://thehackernews.com/2026/03/openclaw-ai-agent-flaws-could-enable.html) and restricted its use on government systems.

:::warning Patch fast
With this disclosure rate, you need a commitment to fast patching. Evie Platform's recommendation: within 48 hours for high severity, same day for critical. See [Hardening](./hardening.md#version-management) for details.
:::

### Exposed instances

Early [Censys](https://censys.io) and [Bitsight](https://www.bitsight.com) scans found over 30,000 OpenClaw instances exposed to the internet without authentication. Later scans pushed that number to 135,000-220,000+. The growth rate alone is a compelling argument for loopback binding — which is why Evie Platform defaults to it.

## Industry frameworks

**OWASP Top 10 for Agentic Applications (2026)** — The ten highest-impact risks for autonomous AI systems. Published December 2025, developed with 100+ industry contributors. The categories map closely to OpenClaw's architecture: goal hijack (prompt injection), tool misuse, privilege abuse, supply chain, unexpected code execution, memory poisoning, inter-agent communication, cascading failures, trust exploitation, and monitoring gaps.

**MITRE ATLAS** — Like MITRE ATT&CK but for AI systems. Updated October 2025 with 14 new agent-specific techniques developed with Zenity Labs. Covers the full attack lifecycle from reconnaissance through exfiltration. Useful for building a formal threat model.

## Related projects

**[OpenClaw PRISM](https://arxiv.org/abs/2603.11853)** (arXiv, March 2026) — Academic paper by Frank Li (UNSW Sydney) describing a zero-fork runtime security layer for OpenClaw. Covers lifecycle-wide interception (10 hooks), hybrid heuristic-plus-LLM scanning, session-level risk accumulation with TTL-based decay, outbound secret pattern scanning, and tamper-evident audit logging. No public source code yet. Evie Platform's [roadmap](#roadmap) draws on PRISM's design as a validated blueprint.

**[ClawGuard](https://github.com/newtro/ClawGuard)** — Open-source security middleware for OpenClaw skills. Skills declare what files, domains, commands, and env vars they need in a `permissions.json`; ClawGuard enforces those declarations at runtime. Includes a global kill switch and tamper-evident audit logs. If you run third-party skills (we don't recommend it), ClawGuard adds a meaningful enforcement layer.

**[SlowMist Security Practice Guide](https://github.com/slowmist/openclaw-security-practice-guide)** — Agentic Zero-Trust Architecture from the blockchain security firm SlowMist. Injects security rules into the agent's system prompt with three-tier defense: pre-action blacklists, in-action permission checks, post-action nightly audits. Prompt-level enforcement has inherent limitations against prompt injection, but the audit structure is worth studying.

**[Auth0: Securing OpenClaw](https://auth0.com/blog/five-step-guide-securing-moltbot-ai-agent/)** — Practical five-step guide covering sandboxing, allowlists, credential scoping, auditing, and group chat separation.

**[Microsoft: Running OpenClaw Safely](https://www.microsoft.com/en-us/security/blog/2026/02/19/running-openclaw-safely-identity-isolation-runtime-risk/)** — Identity, isolation, and runtime risk through the lens of Microsoft Defender XDR. Includes a minimum safe operating posture checklist.

**[Anthropic: Claude Code Sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)** — OS-level sandboxing using bubblewrap (Linux) and seatbelt (macOS) for filesystem and network isolation. Open-sourced at [github.com/anthropic-experimental/sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime).

## Roadmap

Evie Platform's security controls today cover gateway hardening, exec allowlists, channel policies, credential scoping, and the secrets proxy daemon. Here's what's next:

**Bloom filter credential scanning** — Build a bloom filter from 1Password vault entries and scan outbound commands for potential credential exfiltration. The target is sub-5ms per command, though we haven't benchmarked at scale yet. Catches the most dangerous exfiltration pattern: an agent embedding an API key in a curl command or URL.

:::info What's a bloom filter?
A bloom filter is a compact data structure that answers one question very fast: _"Have I seen this before?"_ You feed it a set of known values (in this case, your credentials from 1Password), and it builds a bit array using multiple hash functions. Later, you can test any string against it and get one of two answers: **definitely not in the set** or **probably in the set**.

The key properties that make it useful here:

- **Speed.** Testing a string takes microseconds, not milliseconds. You can scan every command the agent runs without perceptible delay.
- **Size.** A bloom filter holding 1,000 credentials uses roughly 1.2 KB of memory. The full credential values never exist in the filter — only their hashed fingerprints.
- **One-way.** You can't extract the original credentials from the filter. Even if an attacker accessed the filter itself, they'd get a bit array, not your API keys.
- **False positives, never false negatives.** The filter might occasionally flag an innocent string as a match (tunable — typically under 0.1%), but it will _never_ miss a real credential. For security scanning, that's exactly the tradeoff you want.

In practice: Evie Platform syncs your 1Password vault into a bloom filter on startup, then tests every outbound shell command and URL against it. A credential appearing in a `curl` command or git push triggers an immediate block and DM approval request — all in under 5ms.

**Limitations.** A bloom filter catches credentials that appear verbatim in a command. It won't catch a credential that's been split across multiple commands (`echo $KEY | cut -c1-20`), encoded (base64, hex), or assembled through variable interpolation. A prompt-injected agent with enough creativity could evade it. That's why the bloom filter is one layer in a defense-in-depth stack, not the whole defense. The exec allowlist prevents arbitrary `curl` and `echo` commands from running in the first place, and the secrets proxy prevents the agent from ever seeing raw credential values at all. The bloom filter catches the obvious exfiltration pattern that slips through the other layers — a full key in a URL or command argument.
:::

**Tiered risk scoring with time-decay** — Assign base risk scores to action categories. Tier 1 (read-only) runs freely. Tier 2 (reversible writes) pre-approved via allowlist. Tier 3 (external side effects) approved once per session via DM. Tier 4 (destructive/credential operations) always requires human approval. Recently-approved actions decay to lower risk scores; stale approvals climb back up.

**Supervisor agent evaluation** — A secondary agent in a separate context evaluates risky operations before execution. Runs a fast heuristic check first; only escalates to LLM-based evaluation for ambiguous cases. Inspired by PRISM's hybrid scanning pipeline.

**OS-level sandboxing** — Integration with Anthropic's open-source sandbox runtime for filesystem and network isolation at the kernel level. The long-term goal: agents work freely within a sandbox that physically prevents exfiltration, regardless of prompt injection.

## What's in this section

- **[Hardening](./hardening.md)** — Tuning Evie Platform's defaults: gateway, exec, channels, credentials, network egress, and patching.
- **[Multiplayer](./multiplayer.md)** — How Evie Platform makes team and multi-agent access safe: personal/team agent split, DM approvals, memory isolation.
- **[Risk Register](./risk-register.md)** — Each risk, how Evie Platform addresses it, and where you need to take action yourself.
- **[Audit](./audit.md)** — Verifying your security posture, detecting compromise, and prompt injection signatures in logs.
- **[LLM Provider Data Handling](./llm-providers.md)** — What each provider does with your data, how to choose the right tier, and how this compares to tools you already trust.
- **[Credential Managers](./credential-managers.md)** — Comparison of 1Password, Bitwarden, macOS Keychain, GNOME Keyring, pass, KeePassXC, HashiCorp Vault, AWS Secrets Manager, and more. Which ones support mobile push approval for agent access.
