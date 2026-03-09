---
sidebar_position: 3
sidebar_label: Activity Layer
---

# Activity Layer

The activity layer stores raw events from external systems — Slack messages, meeting transcripts, calendar events, email metadata. Unlike memory and knowledge, which the agent actively curates, activity data is ingested automatically and queried on demand.

## What Activity Is (and Isn't)

**Activity is the raw record of what happened externally.** A Slack message, a Fellow meeting transcript, a Google Calendar event. The agent didn't write this data; it arrived from an integration and was stored as-is.

**Activity is not the agent's interpretation.** When the agent reads a Slack thread and decides "this was a decision about using Colima," the decision goes into the knowledge layer as a decision entity. The raw Slack messages stay in the activity layer. One is curated meaning; the other is source material.

This separation matters because the raw data is useful long after the agent has extracted its initial interpretation. Six months later, the agent can re-read the original Slack thread and notice context it missed the first time.

## Storage

Activity goes directly into Postgres tables, one per source. There's no markdown layer here — these are high-volume, structured records that need efficient time-range queries and full-text search.

```sql
-- Slack messages
CREATE TABLE slack_messages (
  id BIGSERIAL PRIMARY KEY,
  team_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  ts TEXT NOT NULL,              -- Slack's message timestamp (unique ID)
  user_id TEXT,
  text TEXT,
  thread_ts TEXT,                -- Parent thread timestamp
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector TSVECTOR         -- Generated for FTS
);

-- Meeting transcripts
CREATE TABLE fellow_meetings (
  id BIGSERIAL PRIMARY KEY,
  event_guid TEXT UNIQUE,
  title TEXT,
  start_time TIMESTAMPTZ,
  transcript TEXT,
  summary TEXT,
  speakers JSONB,
  search_vector TSVECTOR
);
```

**Full-text search** via tsvector handles most activity queries. "What did Jeff say about the deployment last Tuesday?" becomes a time-filtered FTS query against Slack messages.

**JSONB metadata** captures source-specific fields without requiring schema changes for every integration. Slack reactions, Fellow action items, calendar attendee lists — these go into the metadata column and can be queried with Postgres JSON operators.

## Ingestion

Activity data arrives through integration-specific sync scripts. Each integration has its own rhythm and its own sync strategy.

**Slack** uses cursor-based pagination to pull messages incrementally. A sync state table tracks the last-seen timestamp per channel, and each sync run picks up where it left off. Backfills can run in parallel without affecting forward sync.

**Fellow** pulls meeting data via API — title, transcript, AI summary, speakers, and action items. Meetings are keyed by their calendar event GUID, which enables cross-referencing with Google Calendar data.

**Google Calendar** syncs events with attendees, times, and descriptions. The event GUID connects calendar entries to Fellow transcripts, and attendee email addresses link to the identity layer for person resolution.

## Querying Activity

The agent queries activity when it needs to answer questions about what happened in a specific channel, meeting, or time period. A few patterns come up regularly.

**Time-range queries** are the most common. "What happened in the GATX Slack channel this week?" filters by channel and timestamp, then returns the messages in chronological order.

**Thread reconstruction** follows a Slack thread from the parent message through all replies, giving the agent the full conversation context. The `thread_ts` field makes this a simple query.

**Cross-layer joins** connect activity to identity. A Slack message has a `user_id`; the identity layer maps that to a person profile in the knowledge layer. The agent can then query "what has Cedric said about the GATX project?" by joining Slack messages → identity crosslinks → person profiles.

## Relationship to Other Layers

Activity feeds the other layers but doesn't replace them. When the agent reads Slack messages and notices a pattern — a recurring topic, a decision being made, a person's communication style — it captures that insight as memory or knowledge. The activity stays as the source record, available for re-examination later.

**Activity → Episodic Memory:** "We discussed the DTY business case in Slack on March 5" goes into the daily notes.

**Activity → Knowledge:** A new person appears in a meeting transcript, so the agent creates a person profile in the knowledge layer.

**Activity → Identity:** An unknown Slack user ID gets matched to an existing person profile, strengthening the identity graph.
