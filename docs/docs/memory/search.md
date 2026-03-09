---
sidebar_position: 5
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

Search results shouldn't treat a note from six months ago the same as one from yesterday. A conversation about "GATX infrastructure" last week is more relevant than a similar conversation from January — unless the January note has been accessed repeatedly, linked heavily, or sits at a critical point in the knowledge graph.

Attaché's decay model draws from [ACT-R](http://act-r.psy.cmu.edu/) (Adaptive Control of Thought — Rational), a cognitive architecture developed by John Anderson at Carnegie Mellon University since the 1990s. ACT-R models how human declarative memory works: memories that are used frequently and recently stay accessible; unused memories fade. We also draw inspiration from [Ori-Mnemos](https://github.com/aayoawoyemi/Ori-Mnemos), an open-source agent memory system that implements ACT-R with graph-aware extensions.

### Base-Level Activation

Every memory chunk has a **base-level activation** determined by how often and how recently it's been accessed. ACT-R's formula:

```
B_i = ln(Σ t_j^(-d))     for j = 1..n
```

Where:
- `n` = number of times the chunk was accessed
- `t_j` = time since the j-th access (in days)
- `d` = decay parameter (default 0.5)

The key insight: **both frequency and recency matter**. A note accessed 50 times decays much slower than one accessed once, even at the same age. This is fundamentally different from simple exponential decay based on file modification date.

For computational efficiency, ACT-R's own research provides an **optimized approximation** that avoids iterating over every access event:

```
B_i ≈ ln(n / (1 - d)) - d × ln(L)
```

Where `L` is the note's lifetime in days and `n` is the total access count. This is O(1) regardless of access history size.

The raw activation value is normalized to a 0–1 **vitality score** via sigmoid:

```
vitality = 1 / (1 + e^(-B_i))
```

### Metabolic Rates

Not all memory should decay at the same speed. A person's identity doesn't fade like yesterday's standup notes. Attaché applies **metabolic rate multipliers** to the decay parameter based on memory layer:

| Layer | Metabolic Rate | Effective Decay | Behavior |
|---|---|---|---|
| Entity (people, orgs) | 0.1× | Very slow | Identity barely fades |
| Knowledge (research, projects) | 1.0× | Normal | Relevance-driven lifecycle |
| Episodic (daily logs) | 2.0× | Fast | Recent context matters most |
| Activity (messages, transcripts) | 3.0× | Very fast | Burns hot, clears quickly |

The metabolic rate multiplies the base decay parameter: `effective_d = d × metabolic_rate`. An entity with metabolic rate 0.1 and base decay 0.5 has an effective decay of 0.05 — it takes roughly 10× longer to fade than a knowledge note.

### Spreading Activation

When a note is accessed, its **neighbors in the knowledge graph** receive a vitality boost. This models the cognitive science concept of spreading activation: thinking about one topic primes related topics.

The boost propagates along wiki-link edges using BFS:

```
boost_at_hop_k = utility × damping^k
```

With default damping of 0.6 and max 2 hops:
- Hop 1 neighbors: 60% of source utility
- Hop 2 neighbors: 36% of source utility

Boosts are **stored in Postgres and decayed on read** (half-life ~7 days). When you access a note about "GATX," its linked notes about Jeff Nee, the DTY business case, and the Yardbird agent all warm up — even if they haven't been directly accessed recently.

This creates emergent behavior: clusters of actively-used notes form "warm neighborhoods" in the knowledge graph, while isolated, unused notes cool down naturally.

### Structural Protection

Some notes are structurally important even if rarely accessed. A project overview note that connects 15 sub-notes is a **bridge node** — removing it would fragment the graph.

Two mechanisms protect structural integrity:

**Structural boost**: Notes with high in-degree (many incoming links) decay slower. Each incoming link adds ~10% to effective stability, capped at 2×:

```
structural_boost = 1 + 0.1 × min(in_degree, 10)
```

**Bridge protection floor**: [Tarjan's algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_bridge-finding_algorithm) identifies articulation points — notes whose removal would disconnect the graph. These get a minimum vitality floor (default 0.5) regardless of access patterns, preventing them from being archived.

### Revival Spikes

Old notes that gain new connections get a **revival spike** — a 14-day boost that prevents newly-relevant dormant notes from being immediately archived:

```
revival_boost = e^(-0.2 × days_since_new_connection)
```

This handles the case where a 6-month-old research note suddenly becomes relevant because a new project links to it.

### Zone Classification

Notes are classified into zones based on their composite vitality score:

| Zone | Vitality | Behavior |
|---|---|---|
| **Active** | ≥ 0.6 | Fully accessible, prioritized in search results |
| **Stale** | 0.3 – 0.6 | Accessible but deprioritized in rankings |
| **Fading** | 0.1 – 0.3 | Candidate for archival, still searchable |
| **Archived** | &lt; 0.1 | Moved to archive, excluded from default search |

Zone transitions are automatic based on the vitality computation. The `prune` operation analyzes the full activation topology and identifies archive candidates, but always with dry-run as the default — no silent deletions.

### Implementation in Postgres

Access events are stored in an append-only table:

```sql
CREATE TABLE memory_access_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_type  TEXT NOT NULL,       -- 'episodic', 'knowledge', 'entity', 'activity'
  chunk_id    TEXT NOT NULL,       -- permalink or entity ID
  access_type TEXT NOT NULL,       -- 'retrieval', 'read', 'reference', 'write'
  session_id  TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_chunk ON memory_access_events(chunk_id, accessed_at DESC);
```

A materialized activation cache avoids recomputing on every query:

```sql
CREATE TABLE chunk_activation_cache (
  chunk_id        TEXT PRIMARY KEY,
  chunk_type      TEXT NOT NULL,
  access_count    INTEGER NOT NULL DEFAULT 0,
  first_accessed  TIMESTAMPTZ NOT NULL,
  last_accessed   TIMESTAMPTZ NOT NULL,
  base_activation REAL,
  spreading_boost REAL DEFAULT 0,
  structural_boost REAL DEFAULT 1.0,
  vitality        REAL,            -- composite score
  zone            TEXT,            -- 'active', 'stale', 'fading', 'archived'
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

At current scale (under 200K chunks), the optimized approximation computes activation in O(1) per chunk. The access events table grows linearly (~50 events/day × 365 = ~18K rows/year) — trivial for Postgres. If access volume grows significantly, the cache approach means we can always recompute from the materialized summary without scanning the full event log.

### Integration with Search

Vitality scores are incorporated into search ranking as a **multiplicative factor**:

```sql
SELECT
  title,
  (text_rank * 0.3 + semantic_similarity * 0.5) * vitality AS final_score
FROM search_results
JOIN chunk_activation_cache USING (chunk_id)
ORDER BY final_score DESC;
```

Active notes rank higher than stale notes with the same textual or semantic match. Archived notes are excluded from default search but remain queryable with an explicit flag.

### Attribution

The decay model is inspired by:

- **[ACT-R](http://act-r.psy.cmu.edu/)** (Anderson & Lebiere, Carnegie Mellon University) — base-level activation, power law of forgetting, spreading activation, optimized learning approximation. ACT-R is open source under [LGPL v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html).
- **[Ori-Mnemos](https://github.com/aayoawoyemi/Ori-Mnemos)** (Aayo Awoyemi) — metabolic rates, structural protection via Tarjan's algorithm, zone classification, revival spikes. Ori-Mnemos is open source under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).

## Why Not Elasticsearch?

The decision to use Postgres for all search instead of a dedicated search engine was deliberate. Postgres full-text search has real limitations — no fuzzy matching in tsvector (that's why pg_trgm is needed separately), only four relevance weight classes, no autocomplete, basic highlighting.

**But the agent compensates.** There's no search UI where a human types queries and expects instant, perfectly ranked results. The agent formulates queries programmatically, can try multiple approaches in sequence, and interprets results with language understanding. The gap between Postgres FTS and Elasticsearch matters much less when the "user" is an LLM.

**One database is simpler.** Running Postgres, Elasticsearch, and a vector database means three systems to maintain, three sets of data to keep in sync, and three query interfaces to integrate. Postgres with pgvector and pg_trgm consolidates everything into one database that's already running for Supabase.

**Typesense is the upgrade path** if search quality ever becomes a limiting factor. It's a single binary, needs about 50MB of RAM, and is dramatically simpler than Elasticsearch. But at current data volumes (under 200k rows), Postgres handles everything comfortably.
