---
sidebar_position: 2
sidebar_label: Organization
---

# Organization

`schema.org/Organization` — companies, teams, communities, and other groups the agent tracks.

## Example

```markdown
---
type: schema.org/Organization
id: b2c3d4e5-6789-01ab-cdef-234567890abc
permalink: organizations/spantree
title: Spantree, LLC
url: https://spantree.net
industry: Technology Consulting
location: Chicago, IL
same_as:
  - https://linkedin.com/company/spantree
  - https://github.com/spantree
tags:
  - client
  - ai-agents
---

Technology consultancy founded by Cedric Hurst, acquired by
Trifork in May 2024. Focuses on AI agent development, data
engineering, and cloud infrastructure.

## Observations

- [fact] Acquired by Trifork in May 2024 #acquisition
- [fact] Office at 227 W Monroe St, Suite 2100, Chicago
- [status] Operating as Trifork business unit

## Relations

- acquired_by [[organizations/trifork]]
- has_repo [[repos/attache-platform]]
- has_repo [[repos/openclaw]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Organization name (required) |
| `url` | URL | Primary website |
| `industry` | string | Industry or sector |
| `number_of_employees` | number | Approximate headcount |
| `founding_date` | string | When founded |
| `location` | string | Primary location |
| `same_as` | URL[] | Linked profiles (LinkedIn, Crunchbase) |

<details>
<summary>Zod schema</summary>

```typescript
export const OrganizationSchema = z.object({
  type: z.literal("schema.org/Organization"),
  title: z.string(),
  url: z.string().url().optional(),
  industry: z.string().optional(),
  number_of_employees: z.number().optional(),
  founding_date: z.string().optional(),
  location: z.string().optional(),
  same_as: z.array(z.string().url()).default([]),
});
```

</details>
