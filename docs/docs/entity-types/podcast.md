---
sidebar_position: 7
sidebar_label: Podcasts
---

# Podcasts

`schema.org/PodcastEpisode` — podcast episodes worth tracking.

## Example

```markdown
---
type: schema.org/PodcastEpisode
title: "Latent Space: The Agent Memory Problem"
url: https://latent.space/p/agent-memory
duration: PT1H12M
date_published: "2026-01-20T00:00:00Z"
series_name: Latent Space
episode_number: 87
tags:
  - ai-agents
  - memory
---

Deep dive into how different agent frameworks handle
long-term memory, with comparisons to cognitive science models.

## Observations

- [note] Mentions ACT-R as inspiration for decay models
- [recommendation] Relevant to Attaché memory architecture

## Relations

- related_to [[research/agent-memory-patterns]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Episode title (required) |
| `url` | URL | Listen URL |
| `duration` | string | ISO 8601 duration |
| `date_published` | datetime | Publication date |
| `series_name` | string | Podcast series name |
| `episode_number` | number | Episode number |
| `tags` | string[] | Classification tags |

<details>
<summary>Zod schema</summary>

```typescript
export const PodcastEpisodeSchema = z.object({
  type: z.literal("schema.org/PodcastEpisode"),
  title: z.string(),
  url: z.string().url().optional(),
  duration: z.string().optional(),
  date_published: z.string().datetime().optional(),
  series_name: z.string().optional(),
  episode_number: z.number().optional(),
  tags: z.array(z.string()).default([]),
});
```

</details>
