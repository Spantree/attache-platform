---
title: Fellow
sidebar_label: Fellow
slug: /docs/integrations/fellow
---

# Fellow

Evie syncs and searches meeting data from [Fellow](https://fellow.app), including notes, recordings, transcripts, and AI-generated summaries.

## What It Does

**Meeting search.** Full-text search across meeting notes, transcripts, and summaries stored in Postgres. Useful for finding what was discussed, who said what, and what action items came out of a meeting.

**Transcript retrieval.** Pull complete transcripts with speaker attribution. Evie can identify unresolved speakers and attempt to match them against the knowledge base.

**Context assembly.** Before a recurring meeting, Evie can pull notes from previous sessions to provide continuity. She surfaces open action items and unresolved topics.

**Sync.** Meeting data is fetched from Fellow's API and stored locally in Postgres for fast retrieval. The sync runs on demand and can be filtered by date range or meeting series.

## How It Works

Evie connects to Fellow through its REST API with an API key. Meeting data is synced to a local Postgres database, which enables fast full-text search without hitting the API for every query. The skill is a Bun/TypeScript CLI that handles both API sync and local database queries.
