# Security Documentation Review

Reviewer: Claude (CC dispatch)
Date: 2026-03-19
Scope: `docs/docs/security/` — index.md, hardening.md, shared-access.md, risk-register.md, audit.md

---

## Overall Assessment

This is strong security documentation. It reads like it was written by someone who actually operates the system under adversarial conditions, not someone filling out a compliance template. A CTO would take this seriously. The tone is honest about limitations, the CVE references all check out, and the architectural claims are substantiated by the codebase.

That said, there are places where it drifts into generic advice, a few structural issues, and some gaps worth filling.

---

## 1. Substance and Accuracy

### CVE references: all verified

Every CVE cited checks out against NVD, SonicWall, THREATINT, and other primary sources:

- **CVE-2026-25253** (CVSS 8.8) — confirmed. Auth token theft via malicious `gatewayUrl` query parameter. Patched v2026.1.29. ✓
- **CVE-2026-22175** (CVSS 7.1) — confirmed. busybox/toybox shell wrapper allowlist bypass. Patched v2026.2.23. ✓
- Origin bypass, exec glob bypass, credential-in-pairing — all confirmed via OpenClaw release notes and security advisories. ✓

### External references: all verified

Every URL, GitHub repo, and paper reference resolves to real, relevant content:

- OWASP Top 10 for Agentic Applications — confirmed, published December 9–10, 2025. ASI01, ASI04, ASI06 designations match. ✓
- MITRE ATLAS October 2025 update with Zenity Labs — confirmed. 14 agent-specific techniques. ✓
- arXiv PRISM paper (2603.11853) — confirmed. Frank Li, UNSW Sydney. ✓
- Auth0, Microsoft, Anthropic blog posts — all resolve. ✓
- ClawGuard, SlowMist guide — both repos exist with matching descriptions. ✓
- CNCERT warning via The Hacker News — confirmed. ✓
- 30,000+ exposed instances (Censys/Bitsight) — confirmed; actually conservative (later scans found 135,000–220,000+). ✓
- 800+ malicious ClawHub packages — confirmed (ClawHavoc campaign, Koi Security). ✓

### Architecture claims: substantiated by code

The Ansible playbooks, role configurations, and config schemas confirm every architectural claim: dedicated Mac mini, dedicated OS user, Tailscale, 1Password, exec allowlists, channel policies, split personal/team agent model.

### One understatement worth noting

> "Censys and Bitsight scans found over 30,000 OpenClaw instances exposed to the internet"

This was true at initial measurement. By later scans the number reached 135,000–220,000+. The "over 30,000" figure is accurate but dated. Consider updating to reflect the trajectory, since the growth rate is itself a compelling argument for loopback binding.

---

## 2. Credibility

### What works well

The **honest limitations sections** are the strongest credibility signal. Passages like these are rare in vendor security docs:

> "Nobody has solved this. Not OpenAI, not Anthropic, not Google." (index.md, prompt injection)

> "Some things about AI agent deployments can't be fully mitigated with configuration. Documenting them honestly is better than pretending they don't exist." (risk-register.md)

> "Your data goes to LLM providers. Even with zero-retention agreements, your code and conversations travel to Anthropic or OpenAI's servers for inference. This is the cost of using hosted models." (risk-register.md)

The **CVE mapping table** in risk-register.md — showing which CVEs apply to Attaché and which don't — is particularly good. It demonstrates actual analysis, not just listing vulnerabilities to look thorough.

The **four-tier autonomy model** in hardening.md is the most original contribution in the entire section. It directly addresses the real operational tension ("if my agent needs approval for everything, it stops working when I'm away from my desk") with a practical, graduated framework. This is the kind of content that would make a CTO bookmark the page.

### Where credibility thins

The **"Prior art and related projects"** section in index.md reads more like a literature review than operational guidance. The descriptions of PRISM, ClawGuard, and SlowMist are competent summaries but don't connect back to what the reader should _do_. A CTO skimming this section would wonder: "So should I install ClawGuard? Should I wait for PRISM?" The answer isn't given.

The **roadmap** section promises bloom filter credential scanning, tiered risk scoring, supervisor agents, and OS-level sandboxing — all good ideas, but there are no timelines, no prioritization, and no indication of what's actively being worked on vs. aspirational. A reader can't tell if these are next-quarter deliverables or wishlist items.

---

## 3. Writing Quality

### Tone: mostly excellent

The writing is direct and opinionated without being preachy. The imperative voice works well for a hardening guide. Good examples:

> "Start with an empty allowlist. Approve commands as the agent requests them. It's less convenient than 'full' but dramatically more defensible." (hardening.md)

> "Consider documenting your emergency procedure somewhere you can find it under stress — not buried in a config file you have to SSH into the Mac mini to read." (hardening.md)

### AI slop patterns: minimal but present

**Generic padding sentences** — a few places where the writing shifts from specific to vague:

> "AI agents face threats that most software doesn't. Here's what actually keeps us up at night:" (index.md)

The "keeps us up at night" framing is a bit of a cliché. The content that follows is specific enough to not need the theatrical setup.

> "You don't have to figure this out from scratch. Two frameworks are directly relevant:" (index.md)

This is filler. Just introduce the frameworks.

> "The goal isn't to never have an incident. It's to detect it quickly, contain it, and learn from it." (audit.md, final line)

This is the kind of inspirational closer that weakens otherwise operational writing. The incident response checklist above it is excellent — the valediction undercuts it.

**Forced transitions** — the "What Attaché does differently" table in index.md uses the "Most tutorials have you doing X, we do Y" framing. It works once but the pattern is overused across the section. The table itself is strong; the preamble could be trimmer.

### One awkward structure

The **"Balancing autonomy and security"** section in hardening.md is ~50 lines long and feels like it belongs in its own page or at least deserves a more prominent position. It's the most actionable content in the entire security section but it's buried between exec policy details and channel configuration. A reader who stops at the allowlist section and skips ahead to channels will miss the most valuable part.

---

## 4. Gaps

### Missing: what happens when prompt injection succeeds

The docs explain prompt injection well and acknowledge it's unsolved. But there's no section on **detection and response specifically for injection**. The audit.md page covers IOCs for compromise broadly, but a prompt injection doesn't look like a reverse shell attempt. It looks like the agent doing something subtly wrong — sending a message it shouldn't, reading a file that's out of scope, making an API call with unexpected parameters.

What are the log signatures of a successful injection? What does the agent's behavior look like when it's been hijacked vs. when it's just confused? This is a gap that matters operationally.

### Missing: network egress controls

The docs recommend loopback binding and Tailscale for _inbound_ access, but say almost nothing about _outbound_ network restrictions. A compromised agent with curl access can exfiltrate data to any server on the internet. The bloom filter roadmap item addresses credential exfiltration specifically, but there's no guidance on restricting outbound connections today — even simple things like DNS-level blocking of known exfiltration endpoints, or firewall rules limiting which domains the agent can reach.

### Missing: log retention and rotation policy

audit.md mentions logs can grow to "tens of gigabytes" and suggests `tail -c 10000000` as a workaround. There's no guidance on log rotation, retention periods, or archival. For an audit trail, this matters: if your logs rotate before you detect a compromise, you've lost evidence. A short section on configuring logrotate or launchd-based rotation would fill this gap.

### Missing: backup and recovery

If you follow the compromise response procedure and rotate everything, how do you restore the agent to a known-good state? The Ansible playbooks presumably handle this ("re-running a playbook converges back to a known-good configuration"), but the security docs don't close the loop. A sentence or two pointing back to the infrastructure-as-code setup as the recovery path would help.

### Missing: monitoring and alerting

The audit section is entirely manual. There's no mention of automated monitoring — no alerting on suspicious exec patterns, no notification when the agent accesses an unusual credential, no integration with any monitoring stack. The four-tier model in hardening.md implies some automation (DM approval flows), but there's nothing about _detecting_ when something has gone wrong without a human actively looking.

### Missing: update mechanism details

hardening.md says `npm update -g openclaw` but doesn't address: how do you update without downtime? Is there a staged rollout process? Do you test the new version before promoting to production? For a system that recommends same-day patching for critical CVEs, the update procedure is surprisingly thin.

---

## 5. Factual Errors

**No factual errors found.** Every CVE, CVSS score, framework reference, URL, GitHub repo, paper citation, and statistical claim was verified against primary sources. This is unusually clean for documentation of this scope.

### Minor inaccuracies / things to tighten

**risk-register.md, CVE mapping table:**

> "CVE-2026-25253 — Auth token theft via crafted URL | High (8.8) | **Patched** | Attaché ships versions past v2026.1.29"

The "Relevant to Attaché?" column says "Patched" — but that's not answering the question of relevance. It _was_ relevant to any deployment running a version before v2026.1.29. "Mitigated (patched)" or "Yes, patched in current versions" would be clearer.

**risk-register.md:**

> "Gateway token leaked | High | Pairing code shared insecurely; code contains the long-lived gateway token (CVE, versions ≤ 2026.3.12)"

The parenthetical "(CVE, versions ≤ 2026.3.12)" is ambiguous — it reads like there's a CVE for the pairing token issue, but the pairing credential exposure was listed as "Moderate" severity without a CVE number in index.md. If it has a CVE, cite it; if not, drop the "(CVE" prefix.

**hardening.md:**

> "Anthropic's Claude Code team felt so strongly about their equivalent (`--dangerously-skip-permissions`) that they deliberately made the flag name alarming."

The linked Anthropic blog post is about sandboxing, not about the flag naming. This claim about deliberate flag naming may be true but isn't supported by the cited source. Either find the right citation or soften to "the flag name speaks for itself."

---

## Summary

| Dimension            | Rating             | Notes                                                                                                 |
| -------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| Substance & accuracy | **Excellent**      | All facts verified. CVEs, URLs, stats all check out.                                                  |
| Credibility          | **Strong**         | Honest about limitations. Would pass CTO scrutiny. Four-tier model is standout content.               |
| Writing quality      | **Good**           | Direct and opinionated. Minor AI slop at transitions. Autonomy section is buried.                     |
| Completeness         | **Good with gaps** | Missing: injection detection, egress controls, log rotation, monitoring/alerting, recovery procedure. |
| Factual accuracy     | **Excellent**      | Zero errors found. Three minor ambiguities noted above.                                               |

This is above-average security documentation for an open-source project. The gaps are real but they're gaps of _omission_, not gaps of _quality_ — what's here is solid. The most impactful improvements would be: (1) adding injection-specific detection guidance, (2) covering network egress, and (3) promoting the four-tier autonomy model to a more prominent position.
