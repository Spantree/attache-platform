# Security Docs Review (docs/docs/security/*.md)

Below is a direct critique focused on factual accuracy, CTO credibility, AI-writing patterns, missing topics, and misleading statements. Quotes are from the current docs.

## 1) CVE references and technical accuracy

### Internal inconsistencies / likely errors
- **Pairing-token version boundary is inconsistent.**
  - Risk register: “**Pairing code shared insecurely; code contains the long-lived gateway token (CVE, versions ≤ 2026.3.12)**”.
  - Hardening: “**versions ≤ 2026.3.11**”.
  - Index: “Patched in **v2026.3.12**.”
  - These three conflict. One of them is wrong. At minimum you need a single, consistent boundary and a specific CVE/advisory reference.

### CVE references without identifiers or sources
- Several entries are labeled like CVEs but **lack CVE IDs or any advisory link**:
  - “**Origin bypass — WebSocket hijacking via trusted-proxy mode**”
  - “**Exec glob bypass — Wildcard `?` crosses directory boundaries**”
  - “**Credential exposure in pairing**”
- If these are not official CVEs, don’t present them alongside actual CVEs. If they are CVEs, list the IDs and link to advisories.

### Claims that look specific but are uncited
- “**Censys and Bitsight scans found over 30,000 OpenClaw instances exposed to the internet**.”
- “**In early 2026, researchers found over 800 malicious packages**…”
- “**China’s CNCERT has warned about OpenClaw’s weak defaults**…”
- “**Anthropic’s API does not use your data for model training, period.**”
- “**OpenAI’s API hasn’t used customer data for training since March 2023.**”
- “**Amazon Bedrock doesn’t store or log your prompts and completions.**”

These are all **high-impact factual assertions**. For a security audience, especially a CTO, they need citations to primary sources (vendor terms, advisories, scan reports). Without sources, they read like marketing copy.

### Overconfident or absolute technical claims
- “**Prompt injection is unsolved. No filter, no wrapper, no model training has eliminated it.**”
- “**An agent that can’t read files, run commands, or call APIs isn’t very helpful.**”
- “**The agent never sees the actual git token. Even a fully compromised agent can’t exfiltrate it**…”

These statements are either **too absolute** or **technically incomplete**. A CTO will ask: what about partial mitigations, OS-level policy enforcement, sandbox escape, proxy compromise, token replay, audit bypass, or credential leak via logs? The docs should acknowledge assumptions and failure modes.

## 2) Credibility for a CTO audience

### Tone issues
- The tone often reads like a blog post, not a security whitepaper:
  - “**This is the big one.**”
  - “**This isn’t a bug.**”
  - “**Watch this space.**”
- A CTO expects: **clear definitions, explicit assumptions, threat model scope, citations, and measurable controls**. The narrative style undermines authority.

### Lack of verifiability
- Security guidance references non-public or speculative items without evidence:
  - “**OpenClaw PRISM**… no public source code is available.”
  - “**Bloom filter credential scanning**… 1–5ms per command.”
- These look like roadmap assertions without validation. Either provide benchmarks or remove the performance claims.

### Mixing hard requirements and opinion
- “**If that’s unacceptable… the agent can’t work on that project. There’s no halfway measure.**”
  - This ignores private/self-hosted models, on-prem inference, or retrieval-only modes. It reads as a false dichotomy.

## 3) AI writing patterns / indicators

Common patterns that make the text feel AI-generated and reduce trust:
- **Repetitive sentence structures**: “This is…”, “That’s…”, “The goal is…”, “The tradeoff is…”
- **Overuse of bold declaratives**: “**Prompt injection is unsolved.**”, “**Your data goes to LLM providers.**”, “**Useful agents need real access.**”
- **Narrative filler**: “This is the big one.” “Watch this space.” “That’s the single fastest way…”
- **Marketing cadence**: short punchy lines, heavy emphasis, little evidence.

If you want CTO credibility, tighten language and replace rhetoric with precise claims plus references.

## 4) Missing topics (security gaps)

Key areas a CTO will look for that are **not covered or only hinted at**:
- **Threat model scope & assumptions** (what’s in/out of scope, attacker capabilities).
- **Data classification & handling** (sensitive vs. non-sensitive workloads; DLP controls).
- **Network egress control** (allowlist/denylist at OS or firewall level; DNS controls).
- **Logging strategy** (PII redaction, retention policy, access controls, SIEM integration).
- **Key management & secrets rotation** beyond 1Password (HSM/KMS, break-glass procedures).
- **Supply-chain controls** for dependencies and NPM packages (SBOM, pinning, verification).
- **Update integrity** (signed releases, checksum verification, rollback plan).
- **Incident response** (severity levels, RACI, comms plan, forensic snapshotting).
- **Compliance mapping** (SOC 2, ISO 27001, HIPAA, PCI — even if “not certified,” say so).
- **Access control** (SSO/MFA, user lifecycle, offboarding).
- **Backups and recovery** (vault backup, config backup, disaster recovery).

## 5) Potentially misleading statements

- “**Link preview exfiltration … requires no clicks — the preview alone leaks the data.**”
  - This depends on platform settings (previews can be disabled or restricted). The claim is too absolute.

- “**Attaché ships versions past v2026.1.29**.”
  - If customers self-install, this isn’t guaranteed. It should read as a default or installer behavior, and include current versioning policy.

- “**OpenClaw has a built-in audit command**…”
  - If this is not available in all distributions or versions, it’s misleading. The docs should state minimum version requirements.

- “**AWS Bedrock offers the strongest data isolation of any hosted option.**”
  - This is a marketing claim without proof. It needs a source or should be softened.

## 6) Specific improvement recommendations (actionable)

- **Add a “CVE & Advisories” appendix** with: CVE IDs, affected versions, patched versions, links to advisories, and links to fixes/commits.
- **Replace absolute statements with scoped ones**. Example: “Prompt injection is unsolved” → “No current defense fully eliminates prompt injection; mitigations reduce likelihood and impact.”
- **Normalize version references** across pages (single source of truth).
- **Require citations for vendor data-handling claims** (Anthropic, OpenAI, Google, AWS). Add “Last verified: YYYY-MM-DD.”
- **Add a formal threat model section** with assumptions and attacker profiles.
- **Add a minimal security baseline checklist** (patching SLA, token rotation, network controls, SIEM hooks, egress policy).
- **Cut or source speculative roadmap claims** (e.g., 1–5ms overhead) until benchmarked.

---

If you want, I can convert this critique into a patch plan with line-level edits for each file.
