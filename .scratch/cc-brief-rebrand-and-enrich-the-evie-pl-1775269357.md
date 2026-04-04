# CC Dispatch Brief: rebrand-and-enrich-the-evie-pl-1775269357

**Mode:** Autonomous
**Generated:** 2026-04-04T02:22:37.670Z

## Mode: Autonomous

Execute the task independently. Explore, plan, implement, test, and commit.
Use the notification command below for progress updates and when finished.

## Task

Rebrand and enrich the Evie Platform docs site at ~/src/spantree/attache-platform/docs.

CONTEXT: We're on branch feat/rebrand-meetevie-docs. The docusaurus.config.ts is already rebranded (Evie Platform, docs.meetevie.dev). Integration pages from evie-app-site are already copied in. But the content still reads like the old Attaché docs. We need to:

1. REBRAND CONTENT: Go through every .md file in docs/docs/ and make the content read naturally as 'Evie Platform' not 'Attaché'. The sed replacement already changed the word but the surrounding prose may reference 'Attaché' context. Make it flow.

2. BLEND ORBITSHIFT DECK CONTENT: The Slidev deck at ~/src/orbitshift/orbitshift-intro-pq5bzuxa/slides/slides.md has excellent updated content about the platform. Use it to enrich these doc pages:
   - docs/docs/intro.md — update the platform overview using the deck's narrative about OpenClaw as kernel, Evie Platform as distribution, Ego layer, 5-layer memory
   - docs/docs/memory/index.md — enrich with the 5-layer model description from the deck (episodic, identity, topical, procedural, artifact + activity log foundation)
   - docs/docs/security/index.md — add the progressive trust narrative (Claire Vo quote pattern), agent-blind injection, four-tier trust model
   - docs/docs/specifications/skill-manifests.md — add SKILL.md convention details, ClawHub marketplace, MCP bridge
   
3. IMAGES: Copy the Wardley map PNGs from ~/src/orbitshift/orbitshift-intro-pq5bzuxa/slides/public/images/ (evie-platform-L0.png, evie-memory-system-L1.png, evie-security-L1.png, evie-skills-L1.png, evie-infrastructure-L1.png, evie-reasoning-L1.png, openclaw-to-evie-evolution.png) into docs/static/img/ and reference them in the relevant doc pages.

4. ADD AN ARCHITECTURE OVERVIEW PAGE if one doesn't exist at docs/docs/architecture/index.md — use the deck's architecture narrative and the L0 Wardley map.

5. DO NOT TOUCH integrations/qbo/ pages (EULA, privacy, disconnect) — those have legal content.

6. Writing style: technical but accessible. No AI slop (no 'delve', 'crucial', 'landscape', no em dashes, no significance inflation). Write like a sharp engineer explaining their system.

7. After edits, run 'npm run build' in the docs/ directory to verify no broken links.

GIT: Commit changes to the existing branch feat/rebrand-meetevie-docs with descriptive commit messages.

## Communication

To notify Evie of progress or completion:
```bash
openclaw agent --agent main --message "[CC: rebrand-and-enrich-the-evie-pl-1775269357] <your message>" --timeout 30
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
