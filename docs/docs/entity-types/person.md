---
sidebar_position: 1
sidebar_label: Person
---

# Person

`schema.org/Person` — people the agent interacts with, knows about, or encounters in activity data.

Person is the most connected type in the system. Person profiles link to organizations (employment), projects (involvement), events (attendance), and activity data (messages, transcripts) through the [Identity Layer](/memory/identity-layer). Postgres is the system of record for identity data; the markdown note is a materialized view for the structured fields, with freeform observations authored directly in the body.

## Example

```markdown
---
type: schema.org/Person
id: a1b2c3d4-5678-90ab-cdef-1234567890ab
permalink: people/cedric-hurst
title: Cedric Hurst
given_name: Cedric
family_name: Hurst
email: cedric@spantree.net
job_title: Founder & CEO
works_for: Spantree, LLC
url: https://spantree.net
same_as:
  - https://linkedin.com/in/cedrichurst
  - https://github.com/divideby0
tags:
  - engineering
  - leadership
---

Founder and CEO of Spantree, a technology consultancy based in
Chicago. Sold to Trifork in May 2024. Now runs the Spantree
business unit within Trifork, focused on AI agent development
and data engineering.

## Observations

- [fact] Based in West Loop, Chicago
- [skill] TypeScript, Postgres, AI agents #technical
- [preference] Zoom over Google Meet #meetings
- [met_at] GTC 2026 #conference #nvidia
- [interested_in] NVIDIA Omniverse #3d #simulation

## Relations

- works_at [[organizations/spantree]]
- manages [[projects/aurora]]
- member_of [[organizations/trifork]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Full display name (required) |
| `given_name` | string | First name |
| `family_name` | string | Last name |
| `email` | string | Primary email address |
| `job_title` | string | Current role |
| `works_for` | string | Current employer (display name, not a relation) |
| `telephone` | string | Phone number |
| `image` | URL | Profile photo |
| `url` | URL | Primary website |
| `same_as` | URL[] | Linked profiles (LinkedIn, GitHub, Twitter) |

## Folder Promotion

When a person accumulates sub-documents, promote from flat file to folder:

```
# Stage 1: Flat file
people/cedric-hurst.md

# Stage 2: Promoted to folder
people/cedric-hurst/
  index.md              ← entity note (add permalink to preserve links)
  cv.md                 ← generated CV
  meeting-notes.md      ← compiled notes from meetings
```

When promoting, add `permalink: people/cedric-hurst` to the frontmatter so basic-memory continues to resolve `[[people/cedric-hurst]]` links.

## Disambiguation

For name collisions, append the most distinguishing attribute:

```
people/john-smith.md               ← only one
people/john-smith-spantree.md      ← second appears, disambiguate by org
people/john-smith-acme.md
```

The filesystem path is a convenience for humans. The database (entity ID + crosswalks) handles true identity resolution.

## Identity Resolution

Person profiles are tightly coupled with the [Identity Layer](/memory/identity-layer). The `same_as` field seeds initial crosslinks, but most identity bindings come from automated resolution — matching Slack user IDs, calendar emails, and transcript speaker labels to canonical people records.

See [Identity Layer — Match Rules](/memory/identity-layer#match-rules) for how the agent resolves identifiers across systems.

<details>
<summary>Zod schema</summary>

```typescript
import { z } from "zod";

export const PersonSchema = z.object({
  type: z.literal("schema.org/Person"),
  title: z.string(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  email: z.string().email().optional(),
  job_title: z.string().optional(),
  works_for: z.string().optional(),
  telephone: z.string().optional(),
  image: z.string().url().optional(),
  url: z.string().url().optional(),
  same_as: z.array(z.string().url()).default([]),
});
```

</details>
