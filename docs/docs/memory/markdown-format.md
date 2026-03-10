---
sidebar_position: 5
sidebar_label: Markdown Format
---

# Markdown Format

:::tip TL;DR
Every knowledge file is a markdown document with YAML metadata at the top and human-readable prose in the body. Keep the metadata short (names, dates, tags), put the long stuff in the body, and use a simple annotation syntax for observations and relationships. A linter enforces the rules so you don't have to remember them.
:::

All markdown files in the knowledge base follow consistent formatting and annotation rules. These conventions ensure that files are human-readable, Obsidian-compatible, and machine-parseable through the Zod → Markdown serialization layer.

## YAML Frontmatter

### Keep it lean

Frontmatter holds **structured metadata only** — short values, lists, dates, identifiers. Long-form text like descriptions, notes, and context belong in the **document body**.

```yaml
---
# 1. Type (always first)
type: schema.org/Person

# 2. Identity fields
id: a1b2c3d4-5678-90ab-cdef-1234567890ab
permalink: people/cedric-hurst
title: Cedric Hurst

# 3. Schema properties (snake_case, short values only)
email: cedric@spantree.net
job_title: Founder & CEO
works_for: Spantree, LLC

# 4. Classification
tags:
  - engineering
  - leadership
---
```

**Rules:**

- **No long strings in frontmatter.** Descriptions, bios, notes → document body.
- **Lists: always block style** (one `- item` per line, never `[a, b, c]`).
- **Scalars: plain** for short values (`title: Cedric Hurst`).
- **No folded/literal block scalars** (`>` / `|`) in frontmatter — if you need multiple lines, it belongs in the body.

## Document Body

The body holds human-readable prose and basic-memory [knowledge graph annotations](https://docs.basicmemory.com/reference/ai-assistant-guide#observations):

```markdown
---
type: schema.org/Person
id: a1b2c3d4-5678-90ab-cdef-1234567890ab
permalink: people/cedric-hurst
title: Cedric Hurst
email: cedric@spantree.net
job_title: Founder & CEO
works_for: Spantree, LLC
tags:
  - engineering
  - leadership
---

Founder and CEO of Spantree, a technology consultancy based in
Chicago. Sold to Trifork in May 2024. Now runs the Spantree
business unit within Trifork, focused on AI agent development
and data engineering.

## Observations

- [met_at] GTC 2026 #conference #nvidia
- [interested_in] NVIDIA Omniverse #3d #simulation
- [preference] Zoom over Google Meet #meetings
- [skill] TypeScript, Postgres, AI agents #technical

## Relations

- works_at [[organizations/spantree]]
- manages [[projects/aurora]]
- member_of [[organizations/trifork]]
```

## Observation Categories

Observations use the syntax `- [category] content #tag1 #tag2`. Use a **controlled vocabulary** to keep the graph consistent:

| Category | Use for | Example |
|---|---|---|
| `fact` | Objective, verifiable information | `- [fact] Based in West Loop, Chicago` |
| `skill` | Competencies and expertise | `- [skill] Kubernetes, Helm charts #devops` |
| `preference` | Stated preferences | `- [preference] Vim over VS Code #tools` |
| `met_at` | Where/when you encountered them | `- [met_at] GTC 2026 #nvidia` |
| `interested_in` | Topics they care about | `- [interested_in] AI agents #research` |
| `decision` | Choices made | `- [decision] Use Postgres for entity store` |
| `status` | Current state | `- [status] On parental leave until April` |
| `note` | General observations | `- [note] Prefers async over meetings` |
| `issue` | Problems identified | `- [issue] Flaky CI on arm64 builds` |
| `action` | Things to do | `- [action] Follow up re: business case` |

Anything that doesn't fit a category should be a **tag** on an existing observation, not a new category. Keep the category list small and stable.

## Relation Types

Relations use the syntax `- relation_type [[target]]`. Controlled vocabulary:

| Relation | Use for | Example |
|---|---|---|
| `works_at` | Employment | `- works_at [[organizations/spantree]]` |
| `member_of` | Group membership | `- member_of [[organizations/trifork]]` |
| `manages` | Management/ownership | `- manages [[projects/aurora]]` |
| `reports_to` | Reporting structure | `- reports_to [[people/john-smith]]` |
| `part_of` | Hierarchical containment | `- part_of [[projects/attache]]` |
| `related_to` | General connection | `- related_to [[people/raphael-dobers]]` |
| `depends_on` | Dependency | `- depends_on [[projects/basic-memory]]` |
| `acquired_by` | Acquisition | `- acquired_by [[organizations/trifork]]` |
| `attended` | Event participation | `- attended [[events/gtc-2026]]` |
| `authored` | Content creation | `- authored [[media/videos/openclaw-demo]]` |
| `has_repo` | Code repository link | `- has_repo [[repos/aurora-engine]]` |
| `uses` | Technology/tool usage | `- uses [[tools/openclaw]]` |
| `contrasts_with` | Alternative approach | `- contrasts_with [[projects/other-agent]]` |
| `supersedes` | Replacement | `- supersedes [[projects/old-system]]` |

Use `related_to` as the fallback when no specific relation type fits. Avoid inventing one-off relation types — they fragment the graph.

## Enforcement

YAML and annotation style is enforced at the **serialization layer** — the Zod → Markdown marshaller controls output format using the [`yaml` npm package](https://eemeli.org/yaml/) with block-style defaults. A CI linter validates that committed files follow the conventions.

basic-memory's `format` command can be configured with a custom formatter:

```json
{
  "formatter_command": "attache-format {file}"
}
```
