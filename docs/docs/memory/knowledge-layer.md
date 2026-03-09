---
sidebar_position: 2
sidebar_label: Knowledge Layer
---

# Knowledge Layer

The knowledge layer holds entity profiles — the nouns in the agent's world. People, organizations, projects, research topics, decisions. Unlike memory (which is temporal and event-driven), knowledge is structured around *things* and their relationships.

## Dual Storage

Knowledge entities live in two places simultaneously, and that's by design.

**Markdown files in `workspaces/main/knowledge/`** are the source of truth. Each entity is a file with YAML frontmatter for structured fields and a markdown body for rich, unstructured context. These files are human-readable, version-controlled, and editable by both the agent and its human.

**Postgres (via basic-memory)** is the query layer. basic-memory indexes the markdown files into Supabase, extracting frontmatter fields, observations, and relations into database tables. This enables structured queries ("find all people at GATX"), relational traversal ("who is connected to this project?"), and full-text search that markdown files alone can't support.

The markdown files are what you read and edit. The database is what you query. basic-memory keeps them in sync.

## Entity Types

Knowledge is organized into folders by type. Each type has its own conventions for frontmatter fields, but all share the same basic structure.

```
workspaces/main/knowledge/
├── people/                    # Individual humans
│   ├── cedric-hurst.md
│   └── paula-taborda.md
├── organizations/             # Companies, teams, groups
│   ├── spantree.md
│   └── trifork.md
├── projects/                  # Active work efforts
│   └── attache.md
├── research/                  # Deep-dive research notes
│   └── ai-coding-agents/
│       └── coding-agent-taxonomy.md
├── decisions/                 # Recorded decisions with rationale
│   └── colima-over-docker-desktop.md
├── meetings/                  # Meeting notes and outcomes
├── topics/                    # Subject area overviews
├── places/                    # Locations
├── websites/                  # Bookmarked web resources
└── media/                     # Articles, videos, podcasts
```

## File Format

Every knowledge file follows the same pattern: YAML frontmatter for structured data, then markdown for rich context.

```markdown
---
title: Cedric Hurst
type: people
tags: [spantree, trifork, founder]
scopes: [work, personal]
identifiers:
  email: cedric@spantree.net
  github: divideby0
  slack: U035XHR0T
---

# Cedric Hurst

Founder and CEO of Spantree, sold to Trifork in May 2024.
Now runs the Spantree business unit within Trifork.

## Observations

- Prefers direct communication, dislikes corporate fluff
- Deeply technical — don't dumb things down
- Uses Zoom exclusively, never Google Meet
```

**Frontmatter fields** provide the structured data that basic-memory indexes into Postgres. The `type` determines which folder the file lives in. `tags` enable cross-cutting queries. `scopes` control which agents and contexts can see the entity. `identifiers` link the entity to accounts across external systems.

**The markdown body** holds everything that doesn't fit neatly into fields. Observations, context, nuance, history. This is where the agent writes the soft knowledge that makes it genuinely useful — the kind of thing you'd know about a colleague after working with them for months.

## Search

Knowledge supports three search approaches, and they work best in combination.

**Semantic search** uses pgvector embeddings to find conceptually similar entities. Searching for "people working on the AI agent project" finds relevant profiles even if they don't contain those exact words. This is the default search mode and handles most queries well.

**Structured queries** use SQL against basic-memory's Postgres tables. Finding all people with a `@gatx.com` email, or all decisions tagged with a specific project — these are precise lookups where you know exactly what field to filter on.

**Graph traversal** starts from a known entity and follows relations outward. A person profile links to their organization, which links to projects, which link to other people. This is how the agent builds context for a meeting — starting from the attendees and expanding outward to understand the full picture.

## Scoping

Not every agent should see every piece of knowledge. A work agent handling client projects shouldn't have access to personal family details, and a project-specific agent shouldn't see unrelated client data.

**File-level scopes** in frontmatter provide the coarse filter. The `scopes` field lists which contexts an entity belongs to — `work`, `personal`, `gatx`, whatever makes sense for your setup. Agents are configured with allowed scopes, and the retrieval layer enforces the boundary.

**Section-level scopes** offer finer control when a single entity spans multiple contexts. An HTML comment (`<!-- scope: personal -->`) before a section marks everything until the next scope comment as restricted. This lets a person profile have both work-relevant and personal-relevant sections in one file.

## Hybrid People

People are the most complex entity type because they exist across so many systems. The knowledge layer handles this with a two-pronged approach.

**Postgres stores the structured identity data** — names, emails, Slack IDs, GitHub handles, titles, organizations. This powers discovery queries, deduplication, and cross-system matching.

**Markdown stores the soft context** — observations about communication style, preferences, relationship history, meeting notes. This is what makes the agent's interactions feel human rather than robotic.

The two are cross-referenced via the `identifiers` field in frontmatter. When the agent encounters "cedric@spantree.net" in a calendar invite, it can look up the person in Postgres, find the corresponding markdown file, and load the full context.
