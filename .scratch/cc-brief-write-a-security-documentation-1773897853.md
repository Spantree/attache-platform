# CC Dispatch Brief: write-a-security-documentation-1773897853

**Mode:** Autonomous
**Generated:** 2026-03-19T05:24:13.555Z

## Mode: Autonomous

Execute the task independently. Explore, plan, implement, test, and commit.
Use the notification command below for progress updates and when finished.

## Task

Write a security documentation section for the Attaché platform Docusaurus docs site. Create 5 files under docs/docs/security/: index.md (overview + trust model + threat landscape + how Attaché mitigates by design), hardening.md (gateway config, exec policy, channel policies, credential management, version management), shared-access.md (team vs personal agent separation, minimal-tool team agents, memory isolation), risk-register.md (table format covering LLM data exposure, persistent access, messaging attacks, supply chain, context bleed, CVE velocity with Attaché mitigations), and audit.md (openclaw security audit usage, log review procedures, IOC checking, credential rotation, network posture verification). Use Docusaurus frontmatter. Direct, technical, authoritative voice. Use admonitions. Reference OpenClaw 2026.3.12+ as current stable. Be honest about limitations. Do NOT include client disclosure templates or NDA content — this is public-facing documentation. Reference https://docs.openclaw.ai/gateway/security as upstream. Reference CVEs: CVE-2026-25253, CVE-2026-22175, origin bypass, exec bypass, credential exposure in pairing.

## Communication

To notify Evie of progress or completion:
```bash
openclaw agent --agent main --message "[CC: write-a-security-documentation-1773897853] <your message>" --timeout 30
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
