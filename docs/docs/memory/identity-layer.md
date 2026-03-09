---
sidebar_position: 4
sidebar_label: Identity Layer
---

# Identity Layer

The identity layer solves a deceptively hard problem: the same person shows up differently across every system. "Cedric Hurst" in a Fellow transcript, "cedric@spantree.net" on a calendar invite, "divideby0" on GitHub, "U035XHR0T" in Slack. The agent needs to know these are all the same human.

## Why a Dedicated Layer

You might think identity resolution belongs inside the knowledge layer — just put all the identifiers in a person's frontmatter and call it done. That works for manually curated profiles, but it breaks down at scale.

**New identifiers appear constantly.** Every meeting transcript introduces speakers by name. Every Slack message has a user ID. Every calendar event has attendee emails. The agent can't manually update a markdown file for every new signal — it needs an automated pipeline that processes incoming identifiers and matches them to known people.

**Matching is probabilistic.** "C. Hurst" in a meeting transcript is probably Cedric Hurst, but it could be someone else. The identity layer tracks these matches with confidence scores, allowing high-confidence matches to be applied automatically while uncertain ones wait for human review.

**Cross-system joins depend on it.** Without identity resolution, the agent can't connect a Slack message to the person who sent it, or link a meeting attendee to their project history. The identity layer is the bridge that makes cross-layer queries possible.

## Data Model

Identity resolution runs in Postgres with two core tables.

```sql
-- Known identifiers for each person
CREATE TABLE people_identifiers (
  id BIGSERIAL PRIMARY KEY,
  person_id TEXT NOT NULL,          -- Links to knowledge layer
  system TEXT NOT NULL,             -- 'slack', 'github', 'email', etc.
  identifier TEXT NOT NULL,         -- The actual ID in that system
  display_name TEXT,                -- Human-readable name from that system
  confidence NUMERIC DEFAULT 1.0,   -- 1.0 = verified, lower = inferred
  source TEXT,                      -- How this link was established
  UNIQUE(system, identifier)
);

-- Pending matches awaiting resolution
CREATE TABLE people_match_candidates (
  id BIGSERIAL PRIMARY KEY,
  person_id TEXT,                   -- Proposed person (null if new)
  system TEXT NOT NULL,
  identifier TEXT NOT NULL,
  display_name TEXT,
  confidence NUMERIC NOT NULL,
  source TEXT NOT NULL,             -- 'meeting_speaker', 'slack_mention', etc.
  status TEXT DEFAULT 'pending',    -- 'pending', 'accepted', 'rejected'
  resolved_at TIMESTAMPTZ
);
```

**`people_identifiers`** holds verified links between a person and their accounts across systems. When the agent sees a Slack user ID, it looks here first. A confidence of 1.0 means the link is confirmed; lower values indicate inferred connections that haven't been manually verified.

**`people_match_candidates`** is the staging area for new connections. When a meeting transcript mentions "Jeff Nee" and the agent finds a likely match in the knowledge layer, it creates a candidate with a confidence score. High-confidence matches (above 0.9) can be auto-merged. Lower-confidence matches surface for human review.

## Resolution Process

Identity resolution happens in two contexts: real-time (as new data arrives) and batch (periodic reconciliation sweeps).

**Real-time resolution** fires when the agent processes a new meeting, ingests Slack messages, or encounters an unknown identifier. It checks the identifier against `people_identifiers`, and if there's no match, it searches the knowledge layer by name, email patterns, and fuzzy matching. Good matches create candidates; strong matches may auto-merge.

**Meeting-scoped resolution** is particularly powerful. Calendar invites have attendee emails. Fellow transcripts have speaker names. The same meeting's event GUID connects both sources, so the agent can match "Jeff" in the transcript to "jeff.nee@gatx.com" from the calendar invite with high confidence.

**Cross-meeting reinforcement** boosts confidence over time. If "Jeff" in transcript A maps to the same person as "Jeff Nee" in transcript B, and both meetings share the same calendar event series, the confidence score increases. Repeated co-occurrence is strong signal.

## Confidence Tiers

Matches are bucketed into three confidence tiers that determine how they're handled.

**Auto-merge (0.9+)** requires no human intervention. An exact email match, a Slack user ID linked via the Slack API, or a high-confidence cross-system join all qualify. The match is applied immediately and the identifier is added to `people_identifiers`.

**Suggest (0.6–0.9)** means the match is plausible but uncertain. A name-only match from a meeting transcript, or a fuzzy email match where the domain matches but the local part is slightly different. These surface to the human for confirmation.

**Skip (below 0.6)** is too uncertain to even suggest. The candidate is recorded for potential future reinforcement but isn't surfaced unless additional evidence appears.

## Relationship to Knowledge Layer

The identity layer and knowledge layer are tightly coupled but serve different purposes. Knowledge holds the rich profile — observations, context, history. Identity holds the cross-system wiring — which accounts belong to which person.

**Knowledge → Identity:** When the agent creates a person profile in the knowledge layer, it populates the `identifiers` frontmatter field. basic-memory indexes these into Postgres, seeding the identity layer.

**Identity → Knowledge:** When the identity layer resolves a new connection (e.g., linking a Slack user to an existing person), it can update the knowledge file's frontmatter to keep the markdown source of truth current.

This bidirectional sync ensures that the markdown files and the database stay consistent, and either can serve as the starting point for identity resolution.
