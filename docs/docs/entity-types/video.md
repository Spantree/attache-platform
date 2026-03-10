---
sidebar_position: 6
sidebar_label: Videos
---

# Videos

`schema.org/VideoObject` — videos worth remembering: conference talks, tutorials, demos.

## Example

```markdown
---
type: schema.org/VideoObject
title: "OpenClaw: Building Personal AI Agents on macOS"
url: https://youtube.com/watch?v=example
duration: PT45M
upload_date: "2026-02-15T00:00:00Z"
creator: Cedric Hurst
tags:
  - openclaw
  - demo
  - ai-agents
---

Demo walkthrough of OpenClaw's architecture, covering the
memory system, skill dispatch, and multi-channel messaging.

## Observations

- [note] Good overview of the episodic → knowledge pipeline
- [recommendation] Share with new team members as onboarding

## Relations

- related_to [[projects/openclaw]]
- authored [[people/cedric-hurst]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Video title (required) |
| `url` | URL | Watch URL (required) |
| `duration` | string | ISO 8601 duration (e.g., `PT45M`) |
| `upload_date` | datetime | When published |
| `creator` | string | Creator name |
| `thumbnail_url` | URL | Thumbnail image |
| `tags` | string[] | Classification tags |

<details>
<summary>Zod schema</summary>

```typescript
export const VideoObjectSchema = z.object({
  type: z.literal("schema.org/VideoObject"),
  title: z.string(),
  url: z.string().url(),
  duration: z.string().optional(),
  upload_date: z.string().datetime().optional(),
  creator: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
});
```

</details>
