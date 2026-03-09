---
sidebar_position: 4
sidebar_label: Identity Layer
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

Identity resolution runs in Postgres with core tables for entities, crosswalks, activities, and audit history.

### Entities

```sql
-- Canonical entities (golden records)
CREATE TABLE entities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_type   TEXT NOT NULL,        -- 'schema.org/Person', 'schema.org/Organization', etc.
  name          TEXT,                 -- Display name (survivorship-resolved)
  attributes    JSONB DEFAULT '{}',   -- Schema.org properties as JSON
  status        TEXT DEFAULT 'active', -- active, merged, deleted
  merged_into   UUID REFERENCES entities(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### Crosswalks

A **crosswalk** (Reltio's term) is a directional link between a canonical "golden record" and a source-system identifier:

```
entity: cedric-hurst (confidence: 1.0)
  ├── google_calendar → cedric@spantree.net     (deterministic, confidence: 1.0)
  ├── slack           → U01234567               (deterministic, confidence: 1.0)
  ├── fellow          → fellow:person:abc123     (inferred, confidence: 0.95)
  ├── float           → 17851606                 (deterministic, confidence: 1.0)
  └── zoom            → "Cedric's MacBook Pro"   (inferred, confidence: 0.7)
```

```sql
-- Cross-system identity bindings
CREATE TABLE crosswalks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  source        TEXT NOT NULL,        -- 'slack', 'fellow', 'google_calendar', 'zoom'
  external_id   TEXT NOT NULL,        -- ID in that system
  confidence    REAL NOT NULL DEFAULT 1.0,  -- 1.0 = deterministic, <1.0 = inferred
  match_method  TEXT,                 -- 'email_exact', 'name_similarity', 'elimination', 'manual'
  status        TEXT DEFAULT 'active', -- active, pending_review, rejected
  metadata      JSONB DEFAULT '{}',   -- extra context (display name in source, etc.)
  first_seen    TIMESTAMPTZ DEFAULT now(),
  last_seen     TIMESTAMPTZ DEFAULT now(),
  confirmed_by  TEXT,                 -- null = auto, user ID = manually confirmed
  confirmed_at  TIMESTAMPTZ,
  UNIQUE(source, external_id)
);
```

Each crosswalk carries:

- **Source system** — which integration established the binding
- **External ID** — the identifier in that system
- **Confidence** — how certain we are (1.0 = deterministic, &lt;1.0 = inferred)
- **Match method** — how the binding was established (email match, name similarity, process of elimination, manual confirmation)
- **Status** — active, pending review, rejected

### Activity Log

The activity log connects entities to events over time, bridging episodic (temporal) and entity (identity) memory:

```sql
-- Entity-event associations
CREATE TABLE activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  event_type    TEXT NOT NULL,        -- 'meeting', 'message', 'commit', 'task', 'email'
  event_id      TEXT,                 -- source-system event identifier
  role          TEXT,                 -- 'attendee', 'organizer', 'author', 'reviewer'
  source        TEXT NOT NULL,        -- which integration produced this
  occurred_at   TIMESTAMPTZ NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

Activities answer questions like:

- "Who attended this meeting?" → filter by event
- "What has this person been involved in?" → filter by entity
- "Show me all activity in the last 30 days" → filter by time
- "Who works with whom most often?" → co-occurrence analysis

### Audit Trail

```sql
-- Merge/unmerge audit trail
CREATE TABLE entity_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        TEXT NOT NULL,        -- 'merge', 'unmerge', 'crosswalk_add', 'crosswalk_reject'
  entity_id     UUID NOT NULL,
  related_id    UUID,                 -- the other entity in a merge
  details       JSONB DEFAULT '{}',   -- what changed, confidence, reasoning
  performed_by  TEXT,                 -- 'system', 'agent', user ID
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_crosswalks_lookup    ON crosswalks(source, external_id);
CREATE INDEX idx_crosswalks_entity    ON crosswalks(entity_id);
CREATE INDEX idx_crosswalks_pending   ON crosswalks(status) WHERE status = 'pending_review';
CREATE INDEX idx_activities_entity    ON activities(entity_id, occurred_at DESC);
CREATE INDEX idx_activities_event     ON activities(event_type, event_id);
CREATE INDEX idx_activities_time      ON activities(occurred_at DESC);
CREATE INDEX idx_entities_type        ON entities(schema_type);
CREATE INDEX idx_entities_merged      ON entities(merged_into) WHERE merged_into IS NOT NULL;
```

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
