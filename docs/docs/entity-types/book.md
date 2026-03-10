---
sidebar_position: 8
sidebar_label: Books
---

# Books

`schema.org/Book` — books the agent should know about.

## Example

```markdown
---
type: schema.org/Book
title: "Unified Theories of Cognition"
author: Allen Newell
isbn: "978-0674921016"
date_published: "1990"
number_of_pages: 549
tags:
  - cognitive-science
  - act-r
---

Foundational text on cognitive architectures. Describes the
theoretical basis for ACT-R, which informs Attaché's decay model.

## Observations

- [note] Chapter 7 covers declarative memory and activation
- [recommendation] Key reference for decay & retrieval design

## Relations

- informs [[research/agent-memory-patterns]]
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Book title (required) |
| `author` | string | Author name |
| `isbn` | string | ISBN |
| `url` | URL | Link to book |
| `date_published` | string | Publication date |
| `number_of_pages` | number | Page count |
| `tags` | string[] | Classification tags |

<details>
<summary>Zod schema</summary>

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

</details>
