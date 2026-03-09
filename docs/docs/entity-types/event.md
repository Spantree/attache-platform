---
sidebar_position: 4
sidebar_label: Event
---

# Event

`schema.org/Event` — conferences, meetings, workshops, and other time-bound occurrences worth tracking as knowledge entities.

Not every calendar event becomes an Event entity. Routine meetings stay in the [Activity Layer](/memory/activity-layer) as Fellow notes and calendar records. Events are promoted to the knowledge layer when they're significant enough to warrant observations, relations, and long-term recall — a conference attended, a workshop delivered, a milestone event.

## Example

```markdown
---
type: schema.org/Event
id: d4e5f6a7-8901-23ab-cdef-456789012cde
permalink: events/gtc-2026
title: GTC 2026
start_date: "2026-03-17T09:00:00-07:00"
end_date: "2026-03-20T17:00:00-07:00"
location: San Jose Convention Center
organizer: NVIDIA
event_status: scheduled
tags:
  - conference
  - nvidia
  - 3d
---

NVIDIA's annual GPU Technology Conference. Attending for
Omniverse sessions relevant to Kazo project.

## Observations

- [interested_in] Digital twin workflows #omniverse
- [action] Meet with Switch team at NVIDIA booth
- [note] Registration confirmed, hotel booked

## Relations

- related_to [[projects/kazo]]
- related_to [[organizations/nvidia]]
- attended [[people/cedric-hurst]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Event name (required) |
| `start_date` | datetime | Start time (ISO 8601, required) |
| `end_date` | datetime | End time |
| `location` | string | Venue or virtual platform |
| `organizer` | string | Who organized it |
| `attendees` | string[] | Notable attendees |
| `event_status` | enum | `scheduled`, `cancelled`, or `completed` |
| `recording_url` | URL | Recording link if available |
| `source` | string | Where this event came from |

<details>
<summary>Zod schema</summary>

```typescript
export const EventSchema = z.object({
  type: z.literal("schema.org/Event"),
  title: z.string(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  location: z.string().optional(),
  organizer: z.string().optional(),
  attendees: z.array(z.string()).default([]),
  event_status: z.enum(["scheduled", "cancelled", "completed"]).optional(),
  recording_url: z.string().url().optional(),
  source: z.string().optional(),
});
```

</details>
