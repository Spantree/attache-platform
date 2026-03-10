---
sidebar_position: 5
sidebar_label: Entities
---

# Entities

Entity types define the shape of knowledge in the system — what fields a person profile has, what a project looks like, how a research note is structured. Each type has a corresponding markdown format (what you write) and a Zod schema (what validates it).

## Type Naming

Types use **fully-qualified names** to make provenance unambiguous:

- `schema.org/Person` — a standard [Schema.org](https://schema.org) type (portable, understood by LLMs natively)
- `attache.dev/Project` — a custom Attaché type (when no Schema.org type fits)

Schema.org types are **open-world** — you can freely add properties beyond what the spec defines. Most Attaché types use a standard Schema.org type with extension properties. Custom `attache.dev/*` types are only created when no Schema.org type fits at all.

## Common Fields

Every entity includes these identity fields:

```yaml
---
type: schema.org/Person          # fully-qualified type discriminator
id: a1b2c3d4-5678-90ab-cdef-... # Postgres entity UUID
permalink: people/cedric-hurst   # basic-memory permalink (explicit when folderized)
title: Cedric Hurst              # display name
---
```

The `id` field is the **canonical identifier** — it links the markdown note to its crosswalks, activities, and activation cache in Postgres. When a note is materialized from Postgres, `id` is always present. When a note is created manually (e.g., freeform research), `id` is assigned on first sync.

## Property Conventions

- **snake_case** in YAML frontmatter and Postgres columns, mapped from Schema.org's camelCase equivalents (e.g., `given_name` ↔ `givenName`)
- **Short values only** in frontmatter — long-form content goes in the document body
- **Block-style lists** (`- item` per line, never `[a, b, c]`)

See [Markdown Format](/memory/markdown-format) for the full formatting specification.

## Types

| Type | Schema | Stored in |
|---|---|---|
| [People](./person) | `schema.org/Person` | Markdown + Postgres |
| [Organizations](./organization) | `schema.org/Organization` | Markdown + Postgres |
| [Projects](./project) | `attache.dev/Project` | Markdown + Postgres |
| [Events](./event) | `schema.org/Event` | Markdown + Postgres |
| [Research Reports](./research) | `schema.org/Report` | Markdown + Postgres |
| [Videos](./video) | `schema.org/VideoObject` | Markdown |
| [Podcasts](./podcast) | `schema.org/PodcastEpisode` | Markdown |
| [Books](./book) | `schema.org/Book` | Markdown |
| [Web Pages](./web-page) | `schema.org/WebPage` | Markdown |
| [Documents](./digital-document) | `schema.org/DigitalDocument` | Markdown |
| [Guides](./how-to) | `schema.org/HowTo` | Markdown |
| [Repositories](./source-code) | `schema.org/SoftwareSourceCode` | Markdown |
| [Emails](./message) | `schema.org/Message` | Markdown + Postgres |

## Discriminated Union

All types form a discriminated union on the `type` field, enabling runtime validation:

<details>
<summary>Zod schema</summary>

```typescript
import { z } from "zod";

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
  ReportSchema,
]);

export type KnowledgeType = z.infer<typeof KnowledgeTypeSchema>;
```

</details>
