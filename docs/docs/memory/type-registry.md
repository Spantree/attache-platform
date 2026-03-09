---
sidebar_position: 6
sidebar_label: Type Registry
---

# Type Registry

Entity and resource types are defined as Zod schemas with fully-qualified type discriminators. Property names use **snake_case** (matching Postgres and YAML conventions), mapped from Schema.org's camelCase equivalents.

Schemas define **frontmatter-only fields** — short, structured metadata. Long-form content (descriptions, transcripts, notes) belongs in the markdown document body. See [Conventions](./conventions) for formatting rules.

Schema.org types are **open-world** — you can freely add properties beyond what the spec defines. Most Attaché types use a standard Schema.org type with extension properties. Custom `attache.dev/*` types are only created when no Schema.org type fits at all.

### Common fields

Every entity includes these identity fields (not repeated in individual schemas below):

```typescript
// Shared across all knowledge types
const baseFields = {
  id: z.string().uuid(),             // Postgres entity UUID
  permalink: z.string().optional(),  // basic-memory permalink (explicit when folderized)
};
```

The `id` field is the **canonical identifier** — it's the Postgres `entities.id` UUID that links the markdown note to its crosswalks, activities, and activation cache. When a note is materialized from Postgres, `id` is always present. When a note is created manually (e.g., freeform research), `id` is assigned on first sync.

## schema.org/Person

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

## schema.org/Organization

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

## attache.dev/Project

The only custom Attaché type — no Schema.org type fits the concept of a cross-system project container.

```typescript
export const ProjectSchema = z.object({
  type: z.literal("attache.dev/Project"),
  title: z.string(),
  status: z.enum(["active", "archived", "planned"]).optional(),
  repos: z.array(z.string().url()).default([]),
  channels: z.record(z.string()).default({}),
  tags: z.array(z.string()).default([]),
});
```

## schema.org/Event

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

## schema.org/VideoObject

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

## schema.org/PodcastEpisode

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

## schema.org/Book

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

## schema.org/WebPage

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

## schema.org/DigitalDocument

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

## schema.org/HowTo

```typescript
export const HowToSchema = z.object({
  type: z.literal("schema.org/HowTo"),
  title: z.string(),
  audience: z.enum(["human", "agent", "both"]).optional(),
  estimated_time: z.string().optional(),     // ISO 8601 duration
  tags: z.array(z.string()).default([]),
});
```

## schema.org/SoftwareSourceCode

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

## schema.org/Message (DB only)

Messages are too high-volume for markdown files. This schema defines the Postgres row structure.

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

## schema.org/Report (research notes)

`Report` is a standard Schema.org type extended with Attaché properties for the research process. See [Research](./research) for the full workflow.

```typescript
export const ReportSchema = z.object({
  type: z.literal("schema.org/Report"),
  title: z.string(),
  about: z.string().optional(),              // Schema.org: subject matter
  // Attaché extensions
  mode: z.enum(["deep_research", "adaptive", "external"]).optional(),
  status: z.enum(["draft", "pending", "completed", "failed"]).optional(),
  providers: z.record(z.object({
    tool_calls: z.number(),
    model: z.string().optional(),
    cost: z.number().optional(),
  })).default({}),
  tags: z.array(z.string()).default([]),
});
```

## Discriminated Union

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
  ReportSchema,
]);

export type KnowledgeType = z.infer<typeof KnowledgeTypeSchema>;
```
