---
sidebar_position: 7
sidebar_label: Search & Retrieval
---

# Search & Retrieval

An agent that can store information but can't find it again is useless. The search infrastructure is designed around a simple principle: the agent shouldn't need to know *where* an answer lives to find it. Search spans all layers, and retrieval ranking ensures that actively-used knowledge surfaces above stale content.

## Three-Tier Search

Postgres handles all search through three complementary approaches, each covering gaps the others leave.

**Full-text search (tsvector)** is fast, exact, and great at matching specific terms. It supports ranking by relevance, phrase matching, and prefix queries. The weakness is rigidity — it won't find "container runtime" when you search for "Docker."

**Fuzzy matching (pg_trgm)** handles typos and near-misses. If the agent encounters "Spantreee" in a transcript, trigram similarity still finds the right records. Particularly valuable for name matching in the identity layer.

**Semantic search (pgvector)** uses embedding vectors to find conceptually similar content. A search for "who handles infrastructure at Acme" finds relevant person profiles even if they mention "DevOps" or "platform engineering" instead. This is the most flexible mode and the one agents use most often.

## Search by Layer

| Layer | Primary search | Typical query |
|---|---|---|
| Episodic Memory | Semantic (Gemini embeddings) | "When did we decide to use Colima?" |
| Knowledge Base | All three + graph traversal | "Find people related to AI coding tools" |
| Activity Logs | Full-text + time-range filters | "What was discussed in #acme-project last Tuesday?" |
| Identity Graph | pg_trgm fuzzy + exact lookups | Match "Jeff" from a transcript to a known person |

## Architecture

All search runs against Supabase (Postgres) with `pgvector` and `pg_trgm` extensions:

```sql
SELECT
  title,
  ts_rank(search_vector, query) AS text_rank,
  1 - (embedding <=> query_embedding) AS semantic_similarity,
  similarity(title, 'Sarah Chen') AS name_similarity
FROM knowledge_entities,
  plainto_tsquery('english', 'Acme infrastructure') AS query
WHERE search_vector @@ query
   OR embedding <=> query_embedding < 0.3
   OR similarity(title, 'Sarah Chen') > 0.4
ORDER BY (text_rank * 0.3 + semantic_similarity * 0.5 + name_similarity * 0.2) DESC
LIMIT 10;
```

**Embeddings are generated incrementally** — no batch reindexing step. Updates are processed as they arrive.

**The agent reformulates on miss.** If a search returns poor results, it rephrases the query, tries different search tiers, or broadens scope. This agent-in-the-loop approach is a key reason the architecture chose Postgres over dedicated search engines.

## Vitality & Decay

Search results are ranked not just by textual or semantic relevance, but also by **vitality** — a composite score based on access frequency, recency, graph connectivity, and structural importance. Without decay, a 6-month-old note about a resolved bug competes equally with yesterday's architecture decision for context window tokens.

The decay model draws from [ACT-R](http://act-r.psy.cmu.edu/) (Adaptive Control of Thought — Rational) and [Ori-Mnemos](https://github.com/aayoawoyemi/Ori-Mnemos).

### Base-Level Activation

Every memory chunk has a base-level activation determined by how often and how recently it's been accessed:

$$
B_i = \ln\left(\sum_{j=1}^{n} t_j^{-d}\right)
$$

Where $n$ = access count, $t_j$ = time since the $j$-th access (days), $d$ = decay parameter (default $0.5$). An optimized $O(1)$ approximation avoids iterating over every access event. The raw value is normalized to a 0–1 **vitality score** via sigmoid.

### Metabolic Rates

Not all memory decays at the same speed. A person's identity doesn't fade like yesterday's standup notes:

| Layer | Metabolic Rate | Behavior |
|---|---|---|
| Entity (people, orgs) | 0.1× | Identity barely fades |
| Knowledge (research, projects) | 1.0× | Relevance-driven lifecycle |
| Episodic (daily logs) | 2.0× | Recent context matters most |
| Activity (messages, transcripts) | 3.0× | Burns hot, clears quickly |

### Spreading Activation

When a note is accessed, its **neighbors in the knowledge graph** receive a vitality boost (damping factor $\alpha = 0.6$, max 2 hops). This creates emergent behavior: clusters of actively-used notes form "warm neighborhoods" while isolated, unused notes cool down naturally.

### Structural Protection

Some notes are structurally important even if rarely accessed. Notes with high in-degree decay slower (capped at 2× stability). [Tarjan's algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_bridge-finding_algorithm) identifies bridge nodes — notes whose removal would disconnect the graph — and protects them with a minimum vitality floor.

### Zone Classification

| Zone | Vitality | Behavior |
|---|---|---|
| **Active** | ≥ 0.6 | Prioritized in search results |
| **Stale** | 0.3 – 0.6 | Accessible but deprioritized |
| **Fading** | 0.1 – 0.3 | Candidate for archival |
| **Archived** | < 0.1 | Excluded from default search |

Vitality scores integrate into search ranking as a multiplicative factor:

```sql
SELECT title,
  (text_rank * 0.3 + semantic_similarity * 0.5) * vitality AS final_score
FROM search_results
JOIN chunk_activation_cache USING (chunk_id)
ORDER BY final_score DESC;
```

## Why Not Elasticsearch?

Postgres FTS has real limitations — no fuzzy matching in tsvector, only four relevance weight classes, basic highlighting. But the agent compensates. There's no search UI where a human expects perfectly ranked results. The agent formulates queries programmatically, tries multiple approaches, and interprets results with language understanding.

**One database is simpler.** Postgres with pgvector and pg_trgm consolidates everything into one system already running for Supabase. **Typesense is the upgrade path** if search quality becomes a limiting factor at scale.

## Attribution

- **[ACT-R](http://act-r.psy.cmu.edu/)** (Anderson & Lebiere, Carnegie Mellon) — base-level activation, power law of forgetting, spreading activation. [LGPL v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html).
- **[Ori-Mnemos](https://github.com/aayoawoyemi/Ori-Mnemos)** (Aayo Awoyemi) — metabolic rates, structural protection, zone classification, revival spikes. [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
