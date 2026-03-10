---
sidebar_position: 10
sidebar_label: Documents
---

# Documents

`schema.org/DigitalDocument` — documents from external systems like Google Drive and Notion.

## Example

```markdown
---
type: schema.org/DigitalDocument
title: "Q2 Platform Migration Plan"
url: https://docs.google.com/document/d/1abc.../edit
author: Cedric Hurst
date_created: "2026-02-28T00:00:00Z"
date_modified: "2026-03-05T00:00:00Z"
source: google_drive
mime_type: application/vnd.google-apps.document
tags:
  - infrastructure
  - migration
---

Migration plan for moving the analytics platform from
on-prem to cloud infrastructure. Includes timeline,
risk assessment, and rollback procedures.

## Observations

- [status] Draft — awaiting capacity data from ops team
- [action] Validate cost projections with finance

## Relations

- related_to [[projects/aurora]]
- authored [[people/cedric-hurst]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Document title (required) |
| `url` | URL | Link to document |
| `author` | string | Document author |
| `date_created` | datetime | Creation date |
| `date_modified` | datetime | Last modified |
| `source` | string | Origin system (`google_drive`, `notion`, etc.) |
| `mime_type` | string | MIME type |
| `tags` | string[] | Classification tags |

<details>
<summary>Zod schema</summary>

```typescript
export const DigitalDocumentSchema = z.object({
  type: z.literal("schema.org/DigitalDocument"),
  title: z.string(),
  url: z.string().url().optional(),
  author: z.string().optional(),
  date_created: z.string().datetime().optional(),
  date_modified: z.string().datetime().optional(),
  source: z.string().optional(),
  mime_type: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
```

</details>
