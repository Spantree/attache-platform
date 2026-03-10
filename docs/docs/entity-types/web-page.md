---
sidebar_position: 9
sidebar_label: Web Pages
---

# Web Pages

`schema.org/WebPage` — bookmarked web pages, documentation, and articles organized by domain.

WebPages live under `knowledge/sites/` organized by domain (mirroring URL structure), which is the one exception to the rule that folders reflect type taxonomy rather than entity attributes.

## Example

```markdown
---
type: schema.org/WebPage
title: "OpenClaw Documentation — Memory System"
url: https://docs.openclaw.ai/memory
date_modified: "2026-03-01T00:00:00Z"
author: OpenClaw
tags:
  - documentation
  - openclaw
  - memory
---

Overview of OpenClaw's native memory system, covering daily
notes, long-term memory, and semantic search.

## Observations

- [note] Covers episodic memory only; Attaché extends with knowledge layer
- [reference] Canonical docs for memory_search tool behavior

## Relations

- related_to [[projects/openclaw]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Page title (required) |
| `url` | URL | Page URL (required) |
| `date_published` | datetime | Original publication date |
| `date_modified` | datetime | Last updated |
| `author` | string | Author or publisher |
| `tags` | string[] | Classification tags |

<details>
<summary>Zod schema</summary>

```typescript
export const WebPageSchema = z.object({
  type: z.literal("schema.org/WebPage"),
  title: z.string(),
  url: z.string().url(),
  date_published: z.string().datetime().optional(),
  date_modified: z.string().datetime().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
```

</details>
