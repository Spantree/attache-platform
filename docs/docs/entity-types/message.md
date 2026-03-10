---
sidebar_position: 13
sidebar_label: Messages
---

# Messages

`schema.org/Message` — messages the agent tracks across communication systems.

Messages split into two storage patterns based on volume and richness:

**Emails** have a subject, body, and manageable volume — they get **markdown notes + Postgres**. The markdown body preserves the full email content for context and annotation, while Postgres enables search and threading queries.

**Chat messages** (Slack, Discord, etc.) are too high-volume for individual markdown files — they live in **Postgres only**, in integration-specific tables in the [Activity Layer](/memory/activity-layer).

## Email Example

```markdown
---
type: schema.org/Message
id: f6a7b8c9-0123-45ab-cdef-678901234ef0
permalink: messages/2026-03-05-aurora-migration-timeline
title: "Re: Aurora Migration Timeline"
sender: sarah.chen@acme.com
recipient:
  - cedric@spantree.net
  - ops-team@acme.com
date_sent: "2026-03-05T14:22:00Z"
subject: "Re: Aurora Migration Timeline"
source: gmail
in_reply_to: msg-abc123
tags:
  - aurora
  - migration
---

Sarah confirmed the March 15 cutover date works for the
ops team. She flagged two concerns about the rollback
window being too tight during peak hours.

## Observations

- [decision] Cutover date confirmed: March 15 #migration
- [issue] Rollback window may be too tight during peak hours
- [action] Propose extended maintenance window to Sarah

## Relations

- related_to [[projects/aurora]]
- related_to [[people/sarah-chen]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `sender` | string | Sender identifier (required) |
| `recipient` | string[] | Recipient identifiers |
| `date_sent` | datetime | When sent (required) |
| `subject` | string | Message subject |
| `message_id` | string | Source-specific message ID |
| `source` | string | Origin system (`gmail`, `slack`, etc.) |
| `in_reply_to` | string | Parent message ID (threading) |

## Storage by Source

| Source | Storage | Why |
|---|---|---|
| Email (Gmail, etc.) | Markdown + Postgres | Lower volume, rich body, worth annotating |
| Slack | Postgres only | High volume, stored in `slack_messages` table |
| Discord | Postgres only | High volume, ephemeral context |

<details>
<summary>Zod schema</summary>

```typescript
export const MessageSchema = z.object({
  type: z.literal("schema.org/Message"),
  sender: z.string(),
  recipient: z.array(z.string()).default([]),
  date_sent: z.string().datetime(),
  subject: z.string().optional(),
  message_id: z.string().optional(),
  source: z.string().optional(),
  in_reply_to: z.string().optional(),
});
```

</details>
