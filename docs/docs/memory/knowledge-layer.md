---
sidebar_position: 2
sidebar_label: Knowledge Layer
---

# Knowledge Layer

The knowledge layer holds entity profiles — the nouns in the agent's world. People, organizations, projects, research topics, decisions. Unlike memory (which is temporal and event-driven), knowledge is structured around *things* and their relationships.

## Dual Storage

Knowledge entities live in two places simultaneously, and that's by design.

**Markdown files in `workspaces/main/knowledge/`** are the human-readable layer. Each entity is a file with YAML frontmatter for structured fields and a markdown body for rich, unstructured context. These files are version-controlled and editable by both the agent and its human.

**Postgres (via basic-memory)** is the query layer. basic-memory indexes the markdown files into Supabase, extracting frontmatter fields, observations, and relations into database tables. This enables structured queries ("find all people at GATX"), relational traversal ("who is connected to this project?"), and full-text search that markdown files alone can't support.

For entity types (Person, Organization, Project), **Postgres is the system of record** for identity data — crosswalks, confidence scores, merge history. Markdown notes serve as a **materialized view**, regenerated from the authoritative Postgres data. Freeform knowledge about an entity (observations, context, history) is authored directly in the markdown body.

For resource types (VideoObject, WebPage, HowTo), **markdown is primary** with optional database indexing.

## Entity Types

Knowledge is organized into folders by type. Types are **fully qualified** to make provenance unambiguous:

- `schema.org/Person` — a standard [Schema.org](https://schema.org) type
- `attache/Project` — a custom Attaché extension

This makes it immediately clear what's portable (Schema.org, used by 45M+ web domains, understood by LLMs natively) vs. what's our own extension.

```
workspaces/main/knowledge/
├── people/                        # schema.org/Person
├── organizations/                 # schema.org/Organization
├── projects/                      # attache/Project
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
├── research/                      # Freeform research notes (no strict schema)
└── decisions/                     # Decision records (no strict schema)
```

Folders reflect **type taxonomy**, not entity attributes. People are in `people/`, not `people/spantree-net/`. The exception is `sites/`, where the domain *is* the natural organizer (mirroring URL structure).

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

## YAML Frontmatter Conventions

### Frontmatter stays lean

Frontmatter holds **structured metadata only** — short values, lists, dates, identifiers. Long-form text like descriptions, notes, and context belong in the **document body**.

```yaml
---
# 1. Type (always first)
type: schema.org/Person

# 2. Identity fields
permalink: people/cedric-hurst
title: Cedric Hurst
aliases:
  - Cedric
  - cedric-hurst

# 3. Schema properties (snake_case, short values only)
email: cedric@spantree.net
job_title: Founder & CEO
works_for: Spantree, LLC

# 4. Classification
tags:
  - engineering
  - leadership
---
```

**Rules:**

- **No long strings in frontmatter.** Descriptions, bios, notes → document body.
- **Lists: always block style** (one `- item` per line, never `[a, b, c]`).
- **Scalars: plain** for short values (`title: Cedric Hurst`).
- **No folded/literal block scalars** (`>` / `|`) in frontmatter — if you need multiple lines, it belongs in the body.

### Document body: prose + annotations

The body holds human-readable prose and basic-memory [knowledge graph annotations](https://docs.basicmemory.com/reference/ai-assistant-guide#observations):

```markdown
---
type: schema.org/Person
permalink: people/cedric-hurst
title: Cedric Hurst
email: cedric@spantree.net
job_title: Founder & CEO
works_for: Spantree, LLC
tags:
  - engineering
  - leadership
---

Founder and CEO of Spantree, a technology consultancy based in
Chicago. Sold to Trifork in May 2024. Now runs the Spantree
business unit within Trifork, focused on AI agent development
and data engineering.

## Observations

- [met_at] GTC 2026 #conference #nvidia
- [interested_in] NVIDIA Omniverse #3d #simulation
- [preference] Zoom over Google Meet #meetings
- [skill] TypeScript, Postgres, AI agents #technical

## Relations

- works_at [[organizations/spantree]]
- manages [[projects/kazo]]
- member_of [[organizations/trifork]]
```

### Observation categories

Observations use the syntax `- [category] content #tag1 #tag2`. Use a **controlled vocabulary** to keep the graph consistent:

| Category | Use for | Example |
|---|---|---|
| `fact` | Objective, verifiable information | `- [fact] Based in West Loop, Chicago` |
| `skill` | Competencies and expertise | `- [skill] Kubernetes, Helm charts #devops` |
| `preference` | Stated preferences | `- [preference] Vim over VS Code #tools` |
| `met_at` | Where/when you encountered them | `- [met_at] GTC 2026 #nvidia` |
| `interested_in` | Topics they care about | `- [interested_in] AI agents #research` |
| `decision` | Choices made | `- [decision] Use Postgres for entity store` |
| `status` | Current state | `- [status] On parental leave until April` |
| `note` | General observations | `- [note] Prefers async over meetings` |
| `issue` | Problems identified | `- [issue] Flaky CI on arm64 builds` |
| `action` | Things to do | `- [action] Follow up re: business case` |

Anything that doesn't fit a category should be a **tag** on an existing observation, not a new category. Keep the category list small and stable.

### Relation types

Relations use the syntax `- relation_type [[target]]`. Controlled vocabulary:

| Relation | Use for | Example |
|---|---|---|
| `works_at` | Employment | `- works_at [[organizations/spantree]]` |
| `member_of` | Group membership | `- member_of [[organizations/trifork]]` |
| `manages` | Management/ownership | `- manages [[projects/kazo]]` |
| `reports_to` | Reporting structure | `- reports_to [[people/john-smith]]` |
| `part_of` | Hierarchical containment | `- part_of [[projects/attache]]` |
| `related_to` | General connection | `- related_to [[people/raphael-dobers]]` |
| `depends_on` | Dependency | `- depends_on [[projects/basic-memory]]` |
| `acquired_by` | Acquisition | `- acquired_by [[organizations/trifork]]` |
| `attended` | Event participation | `- attended [[events/gtc-2026]]` |
| `authored` | Content creation | `- authored [[media/videos/openclaw-demo]]` |
| `has_repo` | Code repository link | `- has_repo [[repos/spantree-cosmo]]` |
| `uses` | Technology/tool usage | `- uses [[tools/openclaw]]` |
| `contrasts_with` | Alternative approach | `- contrasts_with [[projects/other-agent]]` |
| `supersedes` | Replacement | `- supersedes [[projects/old-system]]` |

Use `related_to` as the fallback when no specific relation type fits. Avoid inventing one-off relation types — they fragment the graph.

### Enforcement

YAML and annotation style is enforced at the **serialization layer** — the Zod → Markdown marshaller controls output format using the [`yaml` npm package](https://eemeli.org/yaml/) with block-style defaults. A CI linter validates that committed files follow the conventions.

basic-memory's `format` command can be configured with a custom formatter:

```json
{
  "formatter_command": "attache-format {file}"
}
```

## Type Registry

Entity and resource types are defined as Zod schemas with fully-qualified type discriminators. Property names use **snake_case** (matching Postgres and YAML conventions), mapped from Schema.org's camelCase equivalents.

Schemas define **frontmatter-only fields** — short, structured metadata. Long-form content (descriptions, transcripts, notes) belongs in the markdown document body.

### schema.org/Person

```typescript
import { z } from "zod";

export const PersonSchema = z.object({
  type: z.literal("schema.org/Person"),
  title: z.string(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  email: z.string().email().optional(),
  job_title: z.string().optional(),
  works_for: z.string().optional(),
  telephone: z.string().optional(),
  image: z.string().url().optional(),
  url: z.string().url().optional(),
  same_as: z.array(z.string().url()).default([]),
});
```

### schema.org/Organization

```typescript
export const OrganizationSchema = z.object({
  type: z.literal("schema.org/Organization"),
  title: z.string(),
  url: z.string().url().optional(),
  industry: z.string().optional(),
  number_of_employees: z.number().optional(),
  founding_date: z.string().optional(),
  location: z.string().optional(),
  same_as: z.array(z.string().url()).default([]),
});
```

### attache/Project

```typescript
export const ProjectSchema = z.object({
  type: z.literal("attache/Project"),
  title: z.string(),
  aliases: z.array(z.string()).default([]),
  status: z.enum(["active", "archived", "planned"]).optional(),
  repos: z.array(z.string().url()).default([]),
  channels: z.record(z.string()).default({}),
  tags: z.array(z.string()).default([]),
});
```

### schema.org/Event

```typescript
export const EventSchema = z.object({
  type: z.literal("schema.org/Event"),
  title: z.string(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  location: z.string().optional(),
  organizer: z.string().optional(),
  attendees: z.array(z.string()).default([]),
  event_status: z.enum(["scheduled", "cancelled", "completed"]).optional(),
  recording_url: z.string().url().optional(),
  source: z.string().optional(),
});
```

### schema.org/VideoObject

```typescript
export const VideoObjectSchema = z.object({
  type: z.literal("schema.org/VideoObject"),
  title: z.string(),
  url: z.string().url(),
  duration: z.string().optional(),           // ISO 8601 (PT45M)
  upload_date: z.string().datetime().optional(),
  creator: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
});
```

### schema.org/PodcastEpisode

```typescript
export const PodcastEpisodeSchema = z.object({
  type: z.literal("schema.org/PodcastEpisode"),
  title: z.string(),
  url: z.string().url().optional(),
  duration: z.string().optional(),
  date_published: z.string().datetime().optional(),
  series_name: z.string().optional(),
  episode_number: z.number().optional(),
  tags: z.array(z.string()).default([]),
});
```

### schema.org/Book

```typescript
export const BookSchema = z.object({
  type: z.literal("schema.org/Book"),
  title: z.string(),
  author: z.string().optional(),
  isbn: z.string().optional(),
  url: z.string().url().optional(),
  date_published: z.string().optional(),
  number_of_pages: z.number().optional(),
  tags: z.array(z.string()).default([]),
});
```

### schema.org/WebPage

```typescript
export const WebPageSchema = z.object({
  type: z.literal("schema.org/WebPage"),
  title: z.string(),
  url: z.string().url(),
  date_published: z.string().datetime().optional(),
  date_modified: z.string().datetime().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
```

### schema.org/DigitalDocument

```typescript
export const DigitalDocumentSchema = z.object({
  type: z.literal("schema.org/DigitalDocument"),
  title: z.string(),
  url: z.string().url().optional(),
  author: z.string().optional(),
  date_created: z.string().datetime().optional(),
  date_modified: z.string().datetime().optional(),
  source: z.string().optional(),             // 'google_drive', 'notion', etc.
  mime_type: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
```

### schema.org/HowTo

```typescript
export const HowToSchema = z.object({
  type: z.literal("schema.org/HowTo"),
  title: z.string(),
  audience: z.enum(["human", "agent", "both"]).optional(),
  estimated_time: z.string().optional(),     // ISO 8601 duration
  tags: z.array(z.string()).default([]),
});
```

### schema.org/SoftwareSourceCode

```typescript
export const SoftwareSourceCodeSchema = z.object({
  type: z.literal("schema.org/SoftwareSourceCode"),
  title: z.string(),
  code_repository: z.string().url().optional(),
  programming_language: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional(),
  license: z.string().optional(),
  default_branch: z.string().optional(),
  topics: z.array(z.string()).default([]),
  source: z.string().optional(),              // 'github', 'gitlab', etc.
  same_as: z.array(z.string().url()).default([]),
});
```

### schema.org/Message (DB only)

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

### Discriminated union

```typescript
export const KnowledgeTypeSchema = z.discriminatedUnion("type", [
  PersonSchema,
  OrganizationSchema,
  ProjectSchema,
  EventSchema,
  VideoObjectSchema,
  PodcastEpisodeSchema,
  BookSchema,
  WebPageSchema,
  DigitalDocumentSchema,
  HowToSchema,
  SoftwareSourceCodeSchema,
  MessageSchema,
]);

export type KnowledgeType = z.infer<typeof KnowledgeTypeSchema>;
```

## Search

Knowledge supports three search approaches, and they work best in combination.

**Semantic search** uses pgvector embeddings to find conceptually similar entities. Searching for "people working on the AI agent project" finds relevant profiles even if they don't contain those exact words — maybe the profile mentions "DevOps" or "platform engineering" instead. This is the most flexible search mode and the one agents use most often.

**Structured queries** use SQL against basic-memory's Postgres tables. Finding all people with a `@gatx.com` email, or all decisions tagged with a specific project — these are precise lookups where you know exactly what field to filter on.

**Graph traversal** starts from a known entity and follows relations outward. A person profile links to their organization, which links to projects, which link to other people. This is how the agent builds context for a meeting — starting from the attendees and expanding outward to understand the full picture.

## Scoping

Not every agent should see every piece of knowledge. A work agent handling client projects shouldn't have access to personal family details, and a project-specific agent shouldn't see unrelated client data.

**File-level scopes** in frontmatter provide the coarse filter. The `scopes` field lists which contexts an entity belongs to — `work`, `personal`, `gatx`, whatever makes sense for your setup. Agents are configured with allowed scopes, and the retrieval layer enforces the boundary.

**Section-level scopes** offer finer control when a single entity spans multiple contexts. An HTML comment (`<!-- scope: personal -->`) before a section marks everything until the next scope comment as restricted. This lets a person profile have both work-relevant and personal-relevant sections in one file.
