---
sidebar_position: 8
sidebar_label: Search
---

# Search

An agent that can store information but can't find it again is useless. The memory system's search infrastructure is designed around a simple principle: the agent shouldn't need to know where an answer lives to find it. Whether the relevant context is in a daily note, a person profile, a Slack message, or a meeting transcript, search should surface it.

## Three-Tier Search

Postgres handles all search through three complementary approaches, each covering gaps the others leave.

**Full-text search (tsvector)** is fast, exact, and great at matching specific terms. When the agent searches for "Colima Docker Desktop," tsvector finds documents containing those words. It supports ranking by relevance, phrase matching, and prefix queries. The weakness is rigidity — it won't find "container runtime" when you search for "Docker."

**Fuzzy matching (pg_trgm)** handles typos and near-misses. If someone types "Cedrci" or the agent encounters "Spantreee" in a transcript, trigram similarity still finds the right records. This is particularly valuable for name matching in the identity layer, where meeting transcripts often contain misspellings or informal names.

**Semantic search (pgvector)** uses embedding vectors to find conceptually similar content. A search for "who handles infrastructure at GATX" finds relevant person profiles even if they don't contain the word "infrastructure" — maybe the profile mentions "DevOps" or "platform engineering" instead. This is the most flexible search mode and the one agents use most often.

## How Search Is Used

Different layers lean on different search tiers depending on the data and access pattern.

**Episodic memory search** relies heavily on semantic search via OpenClaw's `memory_search` tool. Daily notes and MEMORY.md are embedded with Gemini embeddings and searched by conceptual similarity. The agent runs this automatically before answering questions about prior work, decisions, or preferences.

**Knowledge search** uses all three tiers. Semantic search for broad discovery ("find people related to AI coding tools"), structured SQL queries for precise lookups ("all organizations tagged with `client`"), and graph traversal for relationship exploration (starting from one entity and following links outward).

**Activity search** primarily uses full-text search with time-range filters. "What was discussed in #gatx-trifork last Tuesday?" is a tsvector query with a timestamp filter. Fuzzy matching catches misspellings in message content.

**Identity search** relies on pg_trgm for fuzzy name matching and exact lookups on identifiers. When a meeting transcript mentions "Jeff," trigram similarity finds the best person match from known display names.

## Search Architecture

All search runs against Supabase (Postgres) with three extensions working together.

```sql
-- Extensions (installed by Attaché base migrations)
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram fuzzy matching

-- Example: combined search on knowledge entities
SELECT
  title,
  ts_rank(search_vector, query) AS text_rank,
  1 - (embedding <=> query_embedding) AS semantic_similarity,
  similarity(title, 'Jeff Nee') AS name_similarity
FROM knowledge_entities,
  plainto_tsquery('english', 'GATX infrastructure') AS query
WHERE search_vector @@ query
   OR embedding <=> query_embedding < 0.3
   OR similarity(title, 'Jeff Nee') > 0.4
ORDER BY (text_rank * 0.3 + semantic_similarity * 0.5 + name_similarity * 0.2) DESC
LIMIT 10;
```

**Embeddings are generated incrementally.** When a knowledge file is updated or a new Slack message is ingested, its embedding is computed and stored. There's no batch reindexing step that blocks the agent — updates are processed as they arrive.

**The agent reformulates on miss.** If a search returns poor results, the agent doesn't just give up. It rephrases the query, tries different search tiers, or broadens the scope. This agent-in-the-loop approach compensates for the limitations of any single search method — a key reason the architecture chose Postgres over dedicated search engines like Elasticsearch.

## Decay & Retrieval

Search results are ranked not just by textual or semantic relevance, but also by **vitality** — a composite score based on access frequency, recency, graph connectivity, and structural importance. This ensures that actively-used knowledge ranks above stale content with the same textual match.

See [Decay & Retrieval](./decay) for the full model, including ACT-R base-level activation, metabolic rates, spreading activation, and zone classification.

## Why Not Elasticsearch?

The decision to use Postgres for all search instead of a dedicated search engine was deliberate. Postgres full-text search has real limitations — no fuzzy matching in tsvector (that's why pg_trgm is needed separately), only four relevance weight classes, no autocomplete, basic highlighting.

**But the agent compensates.** There's no search UI where a human types queries and expects instant, perfectly ranked results. The agent formulates queries programmatically, can try multiple approaches in sequence, and interprets results with language understanding. The gap between Postgres FTS and Elasticsearch matters much less when the "user" is an LLM.

**One database is simpler.** Running Postgres, Elasticsearch, and a vector database means three systems to maintain, three sets of data to keep in sync, and three query interfaces to integrate. Postgres with pgvector and pg_trgm consolidates everything into one database that's already running for Supabase.

**Typesense is the upgrade path** if search quality ever becomes a limiting factor. It's a single binary, needs about 50MB of RAM, and is dramatically simpler than Elasticsearch. But at current data volumes (under 200k rows), Postgres handles everything comfortably.
