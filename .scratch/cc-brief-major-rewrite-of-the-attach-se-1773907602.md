# CC Dispatch Brief: major-rewrite-of-the-attach-se-1773907602

**Mode:** Autonomous
**Generated:** 2026-03-19T08:06:42.274Z

## Mode: Autonomous

Execute the task independently. Explore, plan, implement, test, and commit.
Use the notification command below for progress updates and when finished.

## Task

Major rewrite of the Attaché security documentation at docs/docs/security/. This is NOT a patch — it's a reframing of all 6 pages.

## Context
The current docs read like a third-party guide to OpenClaw security with an Attaché sticker. They need to read as PRODUCT DOCUMENTATION — what Attaché does for you by default, what it makes easy, what it recommends.

## Required changes

### 1. Product framing (ALL pages)
Reframe everything from 'here's how to secure OpenClaw' to 'here's what Attaché does by default and how to tune it.' The reader should feel like the product is doing the work. Examples:
- 'Attaché binds the gateway to loopback by default' not 'You should bind to loopback'
- 'Attaché configures key-only SSH during setup' not 'Use key-only SSH'
- 'Attaché's exec policy defaults to allowlist mode' not 'Switch exec to allowlist'

### 2. Rename 'Shared Access' to 'Multiplayer'
The shared-access.md page becomes multiplayer.md. 'Multiplayer' is the product term for team/multi-agent access patterns. Frame it as a powerful capability that Attaché makes safe:
- Agents coordinating with agents
- Team members interacting with agents
- All following the same safety protocols enforced by Attaché
- Include the personal+team agent split, DM approval flow, and memory isolation

### 3. Fix factual issues (from Codex review at docs/.scratch/codex-review.md)
- Normalize pairing token version boundary (pick one: 2026.3.11 or 2026.3.12)
- CVE entries without IDs: either find the IDs or clearly label as 'advisory' not 'CVE'
- Add primary source citations for: 30K+ exposed instances, 800+ malicious packages, AWS Bedrock claims, Anthropic retention policy
- Scope absolute statements: 'prompt injection is unsolved' → 'no current defense fully eliminates prompt injection'
- Update exposed instance count: 30K was early measurement; later scans found 135K-220K+

### 4. Fill gaps (from both reviews at docs/.scratch/cc-review.md and docs/.scratch/codex-review.md)
- Network egress controls (even basic guidance on firewall rules/DNS blocking)
- Log retention and rotation policy
- Prompt injection detection signatures (what does a hijacked agent look like in logs?)
- Backup and recovery (connect to Ansible playbooks)
- Monitoring and alerting hooks
- The secrets proxy daemon pattern (from our conversation — wrap op in a proxy, remove op from exec allowlist)
- macOS seatbelt sandbox profiles for admin users

### 5. Add to hardening.md
- Secrets proxy daemon architecture (separate process, Unix socket, per-secret allowlist, DM approval for sensitive secrets)
- Admin user lockdown (why admin is needed on headless Mac, how to still lock down with exec allowlist + seatbelt)
- The --dangerously-skip-permissions citation fix (Codex noted the source doesn't support the claim about deliberate naming)

### 6. Style requirements
- Humanize: no AI slop. Vary sentence length. Have opinions. Be direct.
- Cut narrative filler: 'This is the big one', 'Watch this space', 'keeps us up at night'
- Product voice, not blog voice. A CTO should take this seriously.
- Keep the honest limitations — those are the strongest credibility signal (both reviewers agreed)
- Add 'Last verified: YYYY-MM-DD' to vendor data-handling claims in llm-providers.md

### 7. Do NOT change
- The four-tier autonomy model (both reviewers called it the standout content)
- The risk register tables
- The CVE mapping table
- The roadmap section (bloom filter, risk scoring, supervisor agent, OS sandboxing)

Read docs/.scratch/cc-review.md and docs/.scratch/codex-review.md for the full reviewer feedback. These are your primary inputs alongside this brief.

After rewriting, commit with a descriptive message and notify me.

## Communication

To notify Evie of progress or completion:
```bash
openclaw agent --agent main --message "[CC: major-rewrite-of-the-attach-se-1773907602] <your message>" --timeout 30
```

Use this for:
- Progress updates on major milestones
- Blockers or questions needing clarification
- Completion notification with summary of changes

## Constraints

- Follow conventions in CLAUDE.md at the workspace root
- Use `@evie/lib` shared library for secrets, HTTP, CLI patterns
- New scripts must use Bun + TypeScript (see `skills/scripting/SKILL.md`)
- Incremental migrations only — never modify existing migration files
- Use `trash` over `rm` for deletions
- Commit with descriptive messages; reference issue numbers

---

## ADDENDUM (from Cedric, after initial brief)

### Additional requirements:

1. **Add explainer callouts** (:::info or :::tip admonitions) for technical concepts that non-security readers might not know. Specifically:
   - **Bloom filter**: What it is, how it works for detecting secrets in outbound commands. Use a concrete example — "imagine checking every substring of a curl command against a fingerprint database of your secrets, in under 5 milliseconds."
   - **Seatbelt sandbox**: What macOS seatbelt profiles are and how they enforce kernel-level restrictions.
   - **Prompt injection**: A brief, accessible explanation for readers who aren't familiar.
   - **Zero Data Retention (ZDR)**: What it means practically.
   - Any other jargon that a non-security CTO might stumble on.

2. **Admin user, not restricted user**: The docs currently say "dedicated OS user" implying non-admin/restricted. Attaché uses an ADMIN user because headless Mac minis need admin to avoid invisible GUI authorization prompts. Security is enforced via exec allowlists, secrets proxy, and seatbelt — not OS-level permission restrictions. Fix this everywhere.

3. **"Multiplayer" is the product term** for shared/team agent access. Rename shared-access.md to multiplayer.md. Frame it as a capability Attaché enables safely, not just a risk to mitigate.

---

## ADDENDUM 2: NemoClaw / OpenShell Research

NVIDIA announced NemoClaw at GTC 2026 — an enterprise security stack wrapping OpenClaw. Key components:

### OpenShell (open source runtime)
- Sandboxes agents at the OS level
- Enforces organization's policy-based guardrails (security, network, privacy)
- Built with CrowdStrike, Cisco, Microsoft Security for cybersecurity tool compatibility
- Installs in a single command
- Available on GitHub and build.nvidia.com

### Privacy Router
- Routes sensitive context to local open models (keeps PII on-device)
- Connects agents to cloud frontier models within defined privacy guardrails
- GTC demo showed: prompt with fake PII (names, SSNs, emails) → privacy router tokenized all PII before sending to cloud model
- This is the PII scanning Cedric asked about

### What Attaché should reference
- Position Attaché as complementary to NemoClaw: "If your organization uses NemoClaw, Attaché's hardened Mac mini deployment works alongside OpenShell's sandbox. If you don't use NemoClaw, Attaché provides its own security controls."
- Reference the privacy router's PII tokenization pattern as something Attaché's roadmap includes (alongside bloom filter credential scanning)
- Note that NVIDIA built NemoClaw because they recognized OpenClaw's security gaps — validating the exact problem Attaché solves

### Source URLs
- ZDNet: https://www.zdnet.com/article/nvidia-openclaw-nemoclaw-security-stack-gtc-2026/
- Next Platform: https://www.nextplatform.com/ai/2026/03/17/nvidia-says-openclaw-is-to-agentic-ai-what-gpt-was-to-chattybots/5209428
- NVIDIA announcement: https://nvidianews.nvidia.com/news/nvidia-announces-nemoclaw
- NVIDIA Developer Forums: https://forums.developer.nvidia.com/t/introducing-nvidia-nemoclaw/363701
