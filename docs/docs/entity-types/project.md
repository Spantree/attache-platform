---
sidebar_position: 3
sidebar_label: Project
---

# Project

`attache.dev/Project` — the only custom Attaché type. No Schema.org type fits the concept of a cross-system project container that links repos, channels, and people.

## Example

```markdown
---
type: attache.dev/Project
id: c3d4e5f6-7890-12ab-cdef-345678901bcd
permalink: projects/kazo
title: Kazo
status: active
repos:
  - https://github.com/spantree/cosmo
channels:
  slack: "#kazo-dev"
  discord: "#kazo"
tags:
  - client-project
  - 3d
---

Real-time 3D visualization platform for industrial environments.
Previously codenamed "Cosmo."

## Observations

- [fact] Kazo is the public name; Cosmo is the internal codename
- [decision] Use NVIDIA Omniverse as rendering backend #architecture
- [status] Active development, targeting Q2 2026 launch

## Relations

- part_of [[organizations/spantree]]
- depends_on [[projects/attache]]
- related_to [[people/raphael-dobers]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Project name (required) |
| `status` | enum | `active`, `archived`, or `planned` |
| `repos` | URL[] | Git repository URLs |
| `channels` | Record | Communication channels keyed by platform |
| `tags` | string[] | Classification tags |

<details>
<summary>Zod schema</summary>

```typescript
export const ProjectSchema = z.object({
  type: z.literal("attache.dev/Project"),
  title: z.string(),
  status: z.enum(["active", "archived", "planned"]).optional(),
  repos: z.array(z.string().url()).default([]),
  channels: z.record(z.string()).default({}),
  tags: z.array(z.string()).default([]),
});
```

</details>
