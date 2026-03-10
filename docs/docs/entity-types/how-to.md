---
sidebar_position: 12
sidebar_label: Guides
---

# Guides

`schema.org/HowTo` — runbooks, procedures, and guides. These can target humans, agents, or both.

## Example

```markdown
---
type: schema.org/HowTo
title: "Deploy Attaché to a New Mac Mini"
audience: both
estimated_time: PT2H
tags:
  - deployment
  - attache
  - runbook
---

Step-by-step guide for bootstrapping a new Mac mini with
the Attaché platform.

## Prerequisites

- macOS Sequoia 15.x or later
- Admin SSH access
- Tailscale account

## Steps

1. Install Xcode Command Line Tools
2. Install Homebrew
3. Run `attache bootstrap` with config repo
4. Verify Supabase, OpenClaw, and Tailscale are running

## Observations

- [note] Phase 0 (SSH key, Xcode CLT, Homebrew) is manual
- [issue] Docker Desktop file sharing needs openclaw home added

## Relations

- part_of [[projects/attache]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Guide title (required) |
| `audience` | enum | `human`, `agent`, or `both` |
| `estimated_time` | string | ISO 8601 duration |
| `tags` | string[] | Classification tags |

### Subfolders

```
knowledge/guides/
├── runbooks/              ← operational procedures
└── agent-procedures/      ← agent-specific workflows
```

<details>
<summary>Zod schema</summary>

```typescript
export const HowToSchema = z.object({
  type: z.literal("schema.org/HowTo"),
  title: z.string(),
  audience: z.enum(["human", "agent", "both"]).optional(),
  estimated_time: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
```

</details>
