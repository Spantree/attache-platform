---
sidebar_position: 2
sidebar_label: Knowledge Layer
---

# Knowledge Layer

The knowledge layer holds entity profiles — the nouns in the agent's world. People, organizations, projects, research topics, decisions. Unlike episodic memory (which is temporal and event-driven), knowledge is structured around *things* and their relationships.

## Dual Storage

Knowledge entities live in two places simultaneously, and that's by design.

**Markdown files in `workspaces/main/knowledge/`** are the human-readable layer. Each entity is a file with YAML frontmatter for structured fields and a markdown body for rich, unstructured context. These files are version-controlled and editable by both the agent and its human.

**Postgres (via basic-memory)** is the query layer. basic-memory indexes the markdown files into Supabase, extracting frontmatter fields, observations, and relations into database tables. This enables structured queries ("find all people at GATX"), relational traversal ("who is connected to this project?"), and full-text search that markdown files alone can't support.

For entity types (Person, Organization, Project), **Postgres is the system of record** for identity data — crosswalks, confidence scores, merge history. Markdown notes serve as a **materialized view**, regenerated from the authoritative Postgres data. Freeform knowledge about an entity (observations, context, history) is authored directly in the markdown body.

For resource types (VideoObject, WebPage, HowTo), **markdown is primary** with optional database indexing.

## Entity Types

Knowledge is organized into folders by type. Types are **fully qualified** to make provenance unambiguous:

- `schema.org/Person` — a standard [Schema.org](https://schema.org) type
- `attache.dev/Project` — a custom Attaché type (when no Schema.org type fits)

This makes it immediately clear what's portable vs. what's ours. Schema.org types are **open-world** — you can freely add extension properties beyond the spec. Most types use `schema.org/*` with Attaché-specific extensions (e.g., `schema.org/Report` with `mode` and `providers` fields). Custom `attache.dev/*` types are only created when no Schema.org type fits at all.

```
workspaces/main/knowledge/
├── people/                        # schema.org/Person
├── organizations/                 # schema.org/Organization
├── projects/                      # attache.dev/Project
├── events/                        # schema.org/Event
├── media/
│   ├── videos/                    # schema.org/VideoObject
│   ├── podcasts/                  # schema.org/PodcastEpisode
│   └── books/                     # schema.org/Book
├── sites/
│   ├── docs-openclaw-ai/          # schema.org/WebPage (domain-based)
│   └── spantree-net/
├── docs/
│   ├── google-drive/              # schema.org/DigitalDocument
│   └── notion/
├── guides/                        # schema.org/HowTo
│   ├── runbooks/
│   └── agent-procedures/
├── research/                      # schema.org/Report (with research extensions)
└── decisions/                     # Decision records (freeform)
```

Folders reflect **type taxonomy**, not entity attributes. People are in `people/`, not `people/spantree-net/`. The exception is `sites/`, where the domain *is* the natural organizer (mirroring URL structure).

For the full set of Zod schemas, see the [Type Registry](./type-registry).

## File Naming and Folder Promotion

Entities start as flat files and can be **promoted to folders** when they accumulate sub-documents:

```
# Stage 1: Flat file
people/cedric-hurst.md

# Stage 2: Promoted to folder
people/cedric-hurst/
  index.md              ← entity note (explicit permalink preserves links)
  cv.md                 ← generated CV
  meeting-notes.md      ← compiled notes from meetings
```

When promoting:

1. Move `cedric-hurst.md` → `cedric-hurst/index.md`
2. Add `permalink: people/cedric-hurst` to frontmatter (basic-memory uses this over the auto-generated path, which would otherwise become `people/cedric-hurst/index`)
3. All existing relations (`[[people/cedric-hurst]]`) continue to resolve

Files within a person's folder implicitly relate to that entity — `people/cedric-hurst/cv.md` is obviously about Cedric.

### Disambiguation

For name collisions, append the most distinguishing attribute:

```
people/john-smith.md               ← only one
people/john-smith-spantree.md      ← second appears, disambiguate by org
people/john-smith-gatx.md
```

The filesystem path is a convenience for humans. The database (entity ID + crosswalks) handles true identity resolution.

## Obsidian Compatibility

The knowledge base is designed to work as an [Obsidian](https://obsidian.md) vault. Required setup:

- **[Front Matter Title plugin](https://github.com/snezhig/obsidian-front-matter-title)** — displays the frontmatter `title` field instead of the filename in the file explorer, graph view, tabs, and search. This is essential for `index.md` files in promoted folders to display as "Cedric Hurst" instead of "index".
- **`aliases`** in frontmatter — Obsidian uses these natively for link suggestions and search. Add common name variants.

```yaml
---
type: schema.org/Person
permalink: people/cedric-hurst
title: Cedric Hurst
aliases:
  - Cedric
  - cedric-hurst
---
```

## Search

Knowledge supports three search approaches, and they work best in combination. See [Search](./search) for the full architecture.

**Semantic search** uses pgvector embeddings to find conceptually similar entities.

**Structured queries** use SQL against basic-memory's Postgres tables for precise lookups.

**Graph traversal** starts from a known entity and follows relations outward, building context by expanding the knowledge graph.

## Scoping

Not every agent should see every piece of knowledge. A work agent handling client projects shouldn't have access to personal family details, and a project-specific agent shouldn't see unrelated client data.

**File-level scopes** in frontmatter provide the coarse filter. The `scopes` field lists which contexts an entity belongs to — `work`, `personal`, `gatx`, whatever makes sense for your setup. Agents are configured with allowed scopes, and the retrieval layer enforces the boundary.

**Section-level scopes** offer finer control when a single entity spans multiple contexts. An HTML comment (`<!-- scope: personal -->`) before a section marks everything until the next scope comment as restricted. This lets a person profile have both work-relevant and personal-relevant sections in one file.
