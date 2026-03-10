---
sidebar_position: 3
sidebar_label: Activity Logs
---

# Activity Logs

The activity layer stores raw events from external systems — Slack messages, meeting transcripts, calendar events, email metadata. Unlike memory and knowledge, which the agent actively curates, activity data is ingested automatically and queried on demand.

## What Activity Is (and Isn't)

**Activity is the raw record of what happened externally.** A Slack message, a Fellow meeting transcript, a Google Calendar event. The agent didn't write this data; it arrived from an integration and was stored as-is.

**Activity is not the agent's interpretation.** When the agent reads a Slack thread and decides "this was a decision about using Colima," the decision goes into the knowledge layer as a decision entity. The raw Slack messages stay in the activity layer. One is curated meaning; the other is source material.

This separation matters because the raw data is useful long after the agent has extracted its initial interpretation. Six months later, the agent can re-read the original Slack thread and notice context it missed the first time.

## Storage

Activity goes directly into Postgres tables, one per source. There's no markdown layer here — these are high-volume, structured records that need efficient time-range queries and full-text search.

Rather than a single generic activity table, each integration has **purpose-built tables** that preserve source-specific structure. Every table links back to the [Identity Layer](./identity-layer) via the `_person_id` foreign key convention.

**Slack** stores messages with full threading context, reactions, and blocks:

```sql
CREATE TABLE slack_messages (
  channel_id    TEXT NOT NULL,
  ts            TEXT NOT NULL,         -- Slack's unique message ID
  workspace_id  TEXT NOT NULL,
  user_id       TEXT,
  text          TEXT,
  thread_ts     TEXT,                  -- parent thread
  reactions     JSONB,
  blocks        JSONB,
  _person_id    UUID REFERENCES people(id),
  sent_at       TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (channel_id, ts)
);
```

**Fellow** decomposes meeting data into three tables for precise querying:

```sql
-- Meeting metadata (from Fellow notes)
CREATE TABLE fellow_notes (
  id                TEXT PRIMARY KEY,
  title             TEXT,
  event_guid        TEXT,              -- cross-ref to Google Calendar
  event_start       TIMESTAMPTZ,
  event_end         TIMESTAMPTZ,
  content_markdown  TEXT               -- meeting notes
);

-- Recordings with AI-generated analysis
CREATE TABLE fellow_recordings (
  id              TEXT PRIMARY KEY,
  note_id         TEXT REFERENCES fellow_notes(id),
  ai_summary      TEXT,
  ai_action_items JSONB,
  ai_decisions    JSONB,
  ai_topics       JSONB
);

-- Individual speaker turns (transcript segments)
CREATE TABLE fellow_transcript_segments (
  id              UUID PRIMARY KEY,
  recording_id    TEXT REFERENCES fellow_recordings(id),
  attendee_id     UUID REFERENCES fellow_attendees(id),
  speaker_label   TEXT,                -- raw name from transcript
  offset_start_ms INTEGER NOT NULL,
  offset_end_ms   INTEGER NOT NULL,
  text            TEXT NOT NULL
);
```

This decomposition matters. A question like "what did Jeff say about the deployment?" doesn't search a monolithic transcript blob — it queries individual transcript segments joined to resolved attendee identities, filtered by topic. The `fellow_attendees` table (detailed in the [Identity Layer](./identity-layer)) bridges speaker labels to canonical people.

**Full-text search** via tsvector handles most activity queries. Time-filtered FTS against Slack messages or transcript segments is the most common pattern.

**JSONB columns** capture source-specific structured data (Slack reactions, Fellow AI action items, calendar attendee lists) without requiring schema changes for every new field.

## Ingestion

Activity data arrives through integration-specific sync scripts. Each integration has its own rhythm and its own sync strategy.

**Slack** uses cursor-based pagination to pull messages incrementally. A sync state table tracks the last-seen timestamp per channel, and each sync run picks up where it left off. Backfills can run in parallel without affecting forward sync.

**Fellow** pulls meeting data via API — title, transcript, AI summary, speakers, and action items. Meetings are keyed by their calendar event GUID, which enables cross-referencing with Google Calendar data.

**Google Calendar** syncs events with attendees, times, and descriptions. The event GUID connects calendar entries to Fellow transcripts, and attendee email addresses link to the identity layer for person resolution.

## Querying Activity

The agent queries activity when it needs to answer questions about what happened in a specific channel, meeting, or time period. A few patterns come up regularly.

**Time-range queries** are the most common. "What happened in the #acme-project Slack channel this week?" filters by channel and timestamp, then returns the messages in chronological order.

**Thread reconstruction** follows a Slack thread from the parent message through all replies, giving the agent the full conversation context. The `thread_ts` field makes this a simple query.

**Cross-layer joins** connect activity to identity. A Slack message has a `user_id`; the identity layer maps that to a person profile in the knowledge layer. The agent can then query "what has Cedric said about the Acme project?" by joining Slack messages → identity crosslinks → person profiles.

## Relationship to Other Layers

Activity feeds the other layers but doesn't replace them. When the agent reads Slack messages and notices a pattern — a recurring topic, a decision being made, a person's communication style — it captures that insight as memory or knowledge. The activity stays as the source record, available for re-examination later.

**Activity → Episodic Memory:** "We discussed the migration plan in Slack on March 5" goes into the daily notes.

**Activity → Knowledge:** A new person appears in a meeting transcript, so the agent creates a person profile in the knowledge layer.

**Activity → Identity:** An unknown Slack user ID gets matched to an existing person profile, strengthening the identity graph.
