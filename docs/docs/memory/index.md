---
sidebar_position: 4
sidebar_label: Memory System
---

# Memory System

An Attaché agent wakes up fresh every session. It has no built-in memory of yesterday's conversations, last week's decisions, or the person it's working for. Everything it knows comes from files it reads and databases it queries.

The memory system gives agents continuity across sessions. It's organized into four layers, each handling a different kind of information with storage optimized for how that information is accessed.

## Four Layers

**Episodic memory** is the temporal layer — what happened, when, and in what order. Daily session logs capture the raw stream of events. A curated long-term file distills the important bits. This is the agent's journal and its long-term recall, stored as markdown files that are cheap to read and easy to search. The name comes from cognitive science: [episodic memory](https://en.wikipedia.org/wiki/Episodic_memory) is first-person, time-ordered, and naturally consolidates over time.

**Knowledge** is the entity layer — who, what, and how things relate to each other. People profiles, organization details, research notes, project documentation. These are markdown files indexed by basic-memory into Supabase, with types aligned to [Schema.org](https://schema.org) vocabulary and defined as Zod schemas for validation and programmatic use.

**Activity** is the raw event layer — Slack messages, meeting transcripts, calendar events, email threads. These come from external integrations and land directly in Postgres. The agent doesn't write this data; it ingests and queries it.

**Identity** is the reconciliation layer — connecting the same person across different systems. The "Cedric Hurst" in Slack, the "cedric@spantree.net" in Google Calendar, and the "divideby0" on GitHub are all the same person. Identity resolution happens in Postgres with confidence scoring, crosswalks, and manual overrides — following classic [Master Data Management (MDM)](https://en.wikipedia.org/wiki/Master_data_management) patterns.

## How the Layers Work Together

When an agent needs context, it pulls from multiple layers simultaneously. A question like "what did we discuss with the GATX team last week?" triggers a search across episodic memory (session logs mentioning GATX), knowledge (people profiles for GATX contacts), and activity (Slack messages from the GATX channel).

**Search spans all layers** through a three-tier approach: full-text search via Postgres tsvector, fuzzy matching via pg_trgm, and semantic search via pgvector embeddings. The agent doesn't need to know which layer holds the answer — it searches everywhere and assembles context from the results.

## Storage Architecture

All four layers converge on Supabase (Postgres) as the data backbone, though they use different access patterns.

| Layer | Primary Storage | Access Pattern |
|---|---|---|
| [Episodic Memory](./memory-layer) | Markdown files | File reads + embedding search |
| [Knowledge](./knowledge-layer) | Markdown + Postgres (basic-memory) | Structured queries + semantic search |
| [Activity](./activity-layer) | Postgres | Full-text search + time-range queries |
| [Identity](./identity-layer) | Postgres | Lookup by identifier + fuzzy matching |

**Markdown files live in the workspace** (`workspaces/main/memory/` and `workspaces/main/knowledge/`). They're version-controlled, human-readable, and searchable via OpenClaw's built-in `memory_search` tool.

**Postgres handles everything structured.** basic-memory indexes knowledge files into Postgres for relational queries. Activity data from integrations goes directly into Postgres tables. Identity crosslinks and match candidates live in dedicated tables with foreign keys.

**pgvector enables semantic search** across all layers. Embeddings are generated for memory files, knowledge entities, and activity records, allowing the agent to find relevant context even when the exact words don't match.

## Schema Alignment

Entity types in the knowledge and identity layers use **fully-qualified type names** to make provenance unambiguous:

- `schema.org/Person` — a standard [Schema.org](https://schema.org) type (portable, understood by LLMs natively)
- `attache.dev/Project` — a custom Attaché type (when no Schema.org type fits)

Schema.org types are **open-world** — you can freely add properties beyond what the spec defines. Most Attaché types use a standard Schema.org type with extension properties (e.g., `schema.org/Report` with `mode`, `status`, and `providers` fields for research notes). Custom `attache.dev/*` types are only created when no Schema.org type fits at all.

Property names use **snake_case** in YAML frontmatter and Postgres columns, mapped from Schema.org's camelCase equivalents at the serialization boundary (e.g., `given_name` ↔ Schema.org `givenName`).

Each type has a corresponding Zod schema for validation and programmatic use — see the [Knowledge Layer type registry](./knowledge-layer#type-registry) for the full set.

## Conventions

All markdown files in the memory system follow consistent formatting rules. See [Knowledge Layer — YAML conventions](./knowledge-layer#yaml-frontmatter-conventions) for the full specification, but the key principles are:

- **Frontmatter stays lean** — short scalars and block-style lists only. No long text.
- **Long content goes in the body** — descriptions, notes, and context as regular markdown.
- **Observations and relations** use basic-memory's knowledge graph syntax with a controlled vocabulary of categories and relation types.
