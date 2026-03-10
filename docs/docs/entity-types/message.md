---
sidebar_position: 13
sidebar_label: Messages
---

# Messages

`schema.org/Message` — **Postgres only.** Messages are too high-volume for markdown files. This type defines the database row structure for indexed messages.

Individual Slack messages, emails, and chat messages are stored in integration-specific tables in the [Activity Layer](/memory/activity-layer) (e.g., `slack_messages`). The Message schema describes the common shape for cross-integration queries.

## Fields

| Field | Type | Description |
|---|---|---|
| `sender` | string | Sender identifier (required) |
| `recipient` | string[] | Recipient identifiers |
| `date_sent` | datetime | When sent (required) |
| `subject` | string | Message subject (email) |
| `message_id` | string | Source-specific message ID |
| `source` | string | Origin system (`slack`, `email`, etc.) |
| `in_reply_to` | string | Parent message ID (threading) |

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
