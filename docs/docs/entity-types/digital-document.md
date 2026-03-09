---
sidebar_position: 10
sidebar_label: DigitalDocument
---

# DigitalDocument

`schema.org/DigitalDocument` — documents from external systems like Google Drive and Notion.

## Example

```markdown
---
type: schema.org/DigitalDocument
title: "GATX DTY 2.0 Business Case"
url: https://docs.google.com/document/d/1abc.../edit
author: Cedric Hurst
date_created: "2026-02-28T00:00:00Z"
date_modified: "2026-03-05T00:00:00Z"
source: google_drive
mime_type: application/vnd.google-apps.document
tags:
  - gatx
  - business-case
---

Business case document for the DTY 2.0 proposal at GATX's
Global Innovation Center. Outlines projected $2.38M savings
and R1 retrospective findings.

## Observations

- [status] Draft — awaiting Hearne ops data from Ashish
- [action] Validate savings estimate with Jeff Nee

## Relations

- related_to [[projects/gatx-dty]]
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
