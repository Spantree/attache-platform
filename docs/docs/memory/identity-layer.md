---
sidebar_position: 2
sidebar_label: Identity Graph
---

# Identity Layer

The identity layer solves a deceptively hard problem: the same person shows up differently across every system. "Cedric Hurst" in a Fellow transcript, "cedric@spantree.net" on a calendar invite, "divideby0" on GitHub, "U035XHR0T" in Slack. The agent needs to know these are all the same human.

This is the classic **Master Data Management (MDM)** problem applied to agent memory. The same patterns that enterprise MDM platforms like [Reltio](https://www.reltio.com/) use — crosswalks, match/merge rules, survivorship, stewardship — apply here at a smaller scale.

## Why a Dedicated Layer

You might think identity resolution belongs inside the knowledge layer — just put all the identifiers in a person's frontmatter and call it done. That works for manually curated profiles, but it breaks down at scale.

**New identifiers appear constantly.** Every meeting transcript introduces speakers by name. Every Slack message has a user ID. Every calendar event has attendee emails. The agent can't manually update a markdown file for every new signal — it needs an automated pipeline that processes incoming identifiers and matches them to known people.

**Matching is probabilistic.** "C. Hurst" in a meeting transcript is probably Cedric Hurst, but it could be someone else. "John's iPhone" in a Zoom call might be "John Smith" from the calendar invite — but only by process of elimination. The identity layer tracks these matches with confidence scores, allowing high-confidence matches to be applied automatically while uncertain ones wait for human review.

**Markdown can't express this cleanly.** Putting probabilistic identity bindings in frontmatter would be lossy (no confidence scores), fragile (merging entities means rewriting files), and falsely authoritative (a frontmatter field looks definitive, but the binding might be a guess). Postgres handles this with transactional integrity and queryable audit trails.

**Cross-system joins depend on it.** Without identity resolution, the agent can't connect a Slack message to the person who sent it, or link a meeting attendee to their project history. The identity layer is the bridge that makes cross-layer queries possible.

## Data Model

Identity resolution runs in Postgres. Rather than a single monolithic entity table, the schema uses **dedicated tables per domain** with a unified `_person_id` foreign key convention that links records across integrations to canonical people.

### Core Entity Tables

```sql
-- Canonical people (golden records)
CREATE TABLE people (
  id          UUID PRIMARY KEY,
  first_name  TEXT,
  last_name   TEXT,
  full_name   TEXT,
  permalink   TEXT,           -- links to basic-memory knowledge file
  slug        TEXT,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL
);

-- Canonical organizations
CREATE TABLE organizations (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT,
  domain      TEXT,           -- primary web domain
  industries  TEXT[],
  permalink   TEXT,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL
);
```

### Crosslinks

Crosslinks (our crosswalk implementation) bind a canonical person to their identifiers across systems:

```sql
CREATE TABLE people_crosslinks (
  id          UUID PRIMARY KEY,
  _person_id  UUID NOT NULL REFERENCES people(id),
  source      TEXT NOT NULL,  -- 'slack', 'fellow', 'google_calendar', 'apollo', etc.
  kind        TEXT NOT NULL,  -- 'email', 'slack_id', 'github_handle', 'fellow_attendee', etc.
  value       TEXT NOT NULL,  -- the actual identifier
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL
);
```

A person's crosslinks might look like:

```
people.id: a1b2c3d4
  ├── source: slack,    kind: slack_id,          value: U01234567
  ├── source: slack,    kind: email,             value: cedric@spantree.net
  ├── source: fellow,   kind: email,             value: cedric@spantree.net
  ├── source: fellow,   kind: speaker_label,     value: Cedric Hurst
  ├── source: apollo,   kind: linkedin_url,      value: linkedin.com/in/cedrichurst
  ├── source: github,   kind: github_handle,     value: divideby0
  └── source: float,    kind: float_id,          value: 17851606
```

The `_person_id` foreign key convention extends across all integration tables — `slack_users._person_id`, `slack_messages._person_id`, `fellow_attendees._person_id`, `apollo_people._person_id` — creating a unified identity graph without requiring a separate join table for each integration.

### Integration-Specific Tables

Rather than collapsing everything into generic entity/activity tables, each integration has purpose-built tables that preserve source-specific structure:

**Fellow (meetings):**

```sql
-- Meeting metadata from Fellow
CREATE TABLE fellow_notes (
  id                TEXT PRIMARY KEY,  -- Fellow's note ID
  title             TEXT,
  event_guid        TEXT,              -- links to Google Calendar
  event_start       TIMESTAMPTZ,
  event_end         TIMESTAMPTZ,
  content_markdown  TEXT,              -- meeting notes
  synced_at         TIMESTAMPTZ NOT NULL
);

-- Recordings with AI-generated summaries
CREATE TABLE fellow_recordings (
  id                TEXT PRIMARY KEY,
  note_id           TEXT REFERENCES fellow_notes(id),
  title             TEXT,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  event_guid        TEXT,              -- cross-ref to calendar
  ai_summary        TEXT,
  ai_action_items   JSONB,
  ai_decisions      JSONB,
  ai_topics         JSONB,
  synced_at         TIMESTAMPTZ NOT NULL
);

-- Individual speaker turns in transcripts
CREATE TABLE fellow_transcript_segments (
  id                UUID PRIMARY KEY,
  recording_id      TEXT NOT NULL REFERENCES fellow_recordings(id),
  attendee_id       UUID REFERENCES fellow_attendees(id),
  speaker_label     TEXT,              -- raw speaker name from transcript
  offset_start_ms   INTEGER NOT NULL,
  offset_end_ms     INTEGER NOT NULL,
  timestamp_start   TIMESTAMPTZ,
  timestamp_end     TIMESTAMPTZ,
  text              TEXT NOT NULL
);

-- Meeting attendees (the identity bridge)
CREATE TABLE fellow_attendees (
  id              UUID PRIMARY KEY,
  note_id         TEXT,                -- which meeting
  recording_id    TEXT,                -- which recording
  _person_id      UUID REFERENCES people(id),  -- resolved identity
  email           TEXT,                -- from calendar invite
  speaker_label   TEXT,                -- from transcript
  attendee_type   TEXT NOT NULL        -- 'organizer', 'attendee', 'speaker'
);
```

This decomposition is critical for identity resolution. The `fellow_attendees` table is the bridge: it links a `speaker_label` from the transcript ("Cedric Hurst") to an `email` from the calendar invite (`cedric@spantree.net`) to a resolved `_person_id`. This is where meeting-scoped resolution happens.

**Slack:**

```sql
CREATE TABLE slack_messages (
  channel_id    TEXT NOT NULL,
  ts            TEXT NOT NULL,         -- Slack's unique message ID
  workspace_id  TEXT NOT NULL,
  user_id       TEXT,
  text          TEXT,
  thread_ts     TEXT,                  -- parent thread
  _person_id    UUID REFERENCES people(id),  -- resolved identity
  sent_at       TIMESTAMPTZ NOT NULL,
  -- ... reactions, attachments, blocks as JSONB
  PRIMARY KEY (channel_id, ts)
);

CREATE TABLE slack_users (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  display_name  TEXT,
  real_name     TEXT,
  email         TEXT,
  _person_id    UUID REFERENCES people(id),  -- resolved identity
  -- ...
);
```

**Enrichment (Apollo, Exa):**

```sql
-- Apollo enrichment data for people
CREATE TABLE apollo_people (
  id                UUID PRIMARY KEY,
  _person_id        UUID NOT NULL REFERENCES people(id),
  apollo_id         TEXT,
  title             TEXT,
  headline          TEXT,
  linkedin_url      TEXT,
  email             TEXT,
  seniority         TEXT,
  organization_id   TEXT,
  employment_history JSONB,
  current_roles     JSONB,
  raw_response      JSONB,
  enriched_at       TIMESTAMPTZ NOT NULL
);

-- Apollo enrichment data for organizations
CREATE TABLE apollo_organizations (
  id                    UUID PRIMARY KEY,
  apollo_id             TEXT,
  name                  TEXT,
  primary_domain        TEXT,
  industry              TEXT,
  estimated_num_employees INTEGER,
  technology_names      JSONB,
  raw_response          JSONB,
  enriched_at           TIMESTAMPTZ NOT NULL
);

-- Exa company research
CREATE TABLE exa_companies (
  id                UUID PRIMARY KEY,
  name              TEXT,
  primary_domain    TEXT,
  website_url       TEXT NOT NULL,
  description       TEXT,
  employee_count    INTEGER,
  revenue_annual    BIGINT,
  funding_total     BIGINT,
  raw_response      JSONB,
  enriched_at       TIMESTAMPTZ NOT NULL
);
```

**Research:**

```sql
-- Research session tracking
CREATE TABLE research_activities (
  id              UUID PRIMARY KEY,
  session_id      TEXT NOT NULL,
  mode            TEXT NOT NULL,       -- 'deep_research', 'adaptive', 'external'
  status          TEXT NOT NULL,       -- 'draft', 'pending', 'completed', 'failed'
  permalink       TEXT,                -- links to research note in basic-memory
  provider        TEXT NOT NULL,       -- 'exa', 'firecrawl', 'apollo', etc.
  model           TEXT,
  tool_calls      INTEGER,
  cost_usd        NUMERIC,
  request_summary TEXT,
  started_at      TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL
);
```

### Why Per-Integration Tables?

A generic `activities(entity_id, event_type, event_id, role)` table seems cleaner in theory, but per-integration tables provide:

- **Source-specific columns** — Slack messages have `thread_ts`, `reactions`, `blocks`. Fellow transcripts have `offset_start_ms`, `speaker_label`. These don't fit a generic schema without JSONB catch-alls everywhere.
- **Efficient queries** — "Find all Slack messages from this person in this channel" is a simple indexed query, not a filtered scan of a generic activity table.
- **Direct `_person_id` on source rows** — Rather than joining through an intermediary activity table, every source row directly links to the canonical person. This makes cross-layer queries (identity → activity → context) fast and straightforward.
- **Enrichment isolation** — Apollo and Exa data is stored separately from the canonical record, preserving the raw API response (`raw_response` JSONB) for re-processing and keeping the core `people` table lean.

The `_person_id` foreign key convention across all tables serves the same role as a generic activity log — it's the unified identity thread — but without forcing heterogeneous data into a single table.

### Future: Confidence and Audit

The current `people_crosslinks` table stores deterministic bindings. As probabilistic matching scales, planned additions include:

- **`confidence`** column on crosslinks (1.0 = verified, &lt;1.0 = inferred)
- **`match_method`** column (email_exact, name_similarity, elimination, manual)
- **`status`** column (active, pending_review, rejected)
- **`entity_audit_log`** table for merge/unmerge history

## Match Rules

How does the agent decide two identifiers refer to the same entity?

**Deterministic rules** (confidence = 1.0):
- Exact email match across systems
- Explicit user mapping in configuration
- OAuth identity linking (same SSO account)

**Probabilistic rules** (confidence < 1.0):
- **Name similarity** — "Cedric Hurst" in Fellow matches "cedric.hurst" in Slack
- **Process of elimination** — "John's iPhone" in a 3-person Zoom where only one participant is named John on the calendar invite
- **Temporal co-occurrence** — a Slack message and an email sent within seconds of each other, same topic, likely same person
- **Transitive inference** — if Google Calendar shows `cedric@spantree.net` invited to a meeting, and Fellow's transcript has "Cedric Hurst" speaking, the agent can infer the Fellow identity maps to the email, which maps to the Slack account

**Agent-assisted rules:**
- The agent notices a likely match and asks for human confirmation
- Confidence bumps to 1.0 once confirmed
- Rejected matches are recorded to prevent re-suggestion

### Meeting-scoped Resolution

Meeting-scoped resolution is particularly powerful. Calendar invites have attendee emails. Fellow transcripts have speaker names. The same meeting's event GUID connects both sources, so the agent can match "Jeff" in the transcript to "jeff.nee@gatx.com" from the calendar invite with high confidence.

**Cross-meeting reinforcement** boosts confidence over time. If "Jeff" in transcript A maps to the same person as "Jeff Nee" in transcript B, and both meetings share the same calendar event series, the confidence score increases. Repeated co-occurrence is strong signal.

## Confidence Tiers

Matches are bucketed into three confidence tiers that determine how they're handled.

**Auto-merge (0.9+)** requires no human intervention. An exact email match, a Slack user ID linked via the Slack API, or a high-confidence cross-system join all qualify. The match is applied immediately and the identifier is added to `crosswalks`.

**Suggest (0.6–0.9)** means the match is plausible but uncertain. A name-only match from a meeting transcript, or a fuzzy email match where the domain matches but the local part is slightly different. These surface to the human for confirmation.

**Skip (below 0.6)** is too uncertain to even suggest. The candidate is recorded for potential future reinforcement but isn't surfaced unless additional evidence appears.

## Merge and Unmerge

Unlike markdown files, Postgres supports **transactional merge/unmerge**:

**Merge** (two entities → one):
1. Pick a survivor record (or create a new golden record)
2. Move all crosswalks from the merged entity to the survivor
3. Reassign all activities to the survivor
4. Record the merge in the audit log (who, when, why, confidence)
5. Soft-delete the merged entity (keep for unmerge)
6. Regenerate the markdown note for the survivor

**Unmerge** (undo a bad merge):
1. Restore the soft-deleted entity
2. Move back the crosswalks that originally belonged to it
3. Reassign activities based on the original source
4. Record the unmerge in the audit log
5. Regenerate both markdown notes

### Survivorship Rules

When the same attribute exists in multiple source systems, which value wins?

- **Source priority** — prefer authoritative systems (HR > Slack display name)
- **Most recent** — use the latest-updated value
- **Most complete** — prefer the most detailed version
- **Manual override** — human-set values always win

## Relationship to Knowledge Layer

The identity layer and knowledge layer are tightly coupled but serve different purposes. Knowledge holds the rich profile — observations, context, history. Identity holds the cross-system wiring — which accounts belong to which person.

**Knowledge → Identity:** When the agent creates a person profile in the knowledge layer, basic-memory indexes its frontmatter into Postgres, seeding the identity layer with initial crosswalks from the `same_as` field and structured properties.

**Identity → Knowledge:** When the identity layer resolves a new connection (e.g., linking a Slack user to an existing person), the sync process regenerates the markdown note's structured frontmatter to keep the materialized view current. The freeform body (observations, prose) is preserved.

This bidirectional sync ensures that the markdown files and the database stay consistent, and either can serve as the starting point for identity resolution.

## Open Questions

- **Match confidence calibration** — what real-world accuracy do the 0.6/0.9 thresholds produce?
- **Conflict resolution UX** — how should ambiguous matches surface to the user?
- **Retention policy** — how long to keep activity records? Archive after N months?
- **Privacy boundaries** — which entity data can surface in group contexts?
- **Sync cadence** — how often to regenerate markdown from Postgres? Event-driven (on write) vs. periodic (cron)?
- **Federation** — can entity memory span multiple Attaché instances?
