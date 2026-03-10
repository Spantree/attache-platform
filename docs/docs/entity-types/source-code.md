---
sidebar_position: 13
sidebar_label: Repositories
---

# Repositories

`schema.org/SoftwareSourceCode` — git repositories and codebases the agent works with or references.

## Example

```markdown
---
type: schema.org/SoftwareSourceCode
title: Attaché Platform
code_repository: https://github.com/spantree/attache-platform
programming_language:
  - TypeScript
  - Python
license: UNLICENSED
default_branch: main
source: github
topics:
  - ai-agents
  - macos
  - ansible
same_as:
  - https://docs.attache.dev
---

Turnkey platform for deploying personal AI agents on macOS.
Ansible playbooks + OpenClaw + Supabase + Tailscale.

## Observations

- [fact] Two-layer design: base platform + user config repo
- [note] CLI is Python via uv; runtime is Node/Bun

## Relations

- manages [[people/cedric-hurst]]
- part_of [[organizations/spantree]]
- depends_on [[projects/openclaw]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Repository name (required) |
| `code_repository` | URL | Git clone/browse URL |
| `programming_language` | string or string[] | Primary languages |
| `license` | string | License identifier |
| `default_branch` | string | Default branch name |
| `topics` | string[] | Repository topics |
| `source` | string | Hosting platform (`github`, `gitlab`) |
| `same_as` | URL[] | Related URLs (docs site, npm package) |

<details>
<summary>Zod schema</summary>

```typescript
export const SoftwareSourceCodeSchema = z.object({
  type: z.literal("schema.org/SoftwareSourceCode"),
  title: z.string(),
  code_repository: z.string().url().optional(),
  programming_language: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional(),
  license: z.string().optional(),
  default_branch: z.string().optional(),
  topics: z.array(z.string()).default([]),
  source: z.string().optional(),
  same_as: z.array(z.string().url()).default([]),
});
```

</details>
