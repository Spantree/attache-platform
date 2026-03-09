---
sidebar_position: 9
sidebar_label: Decay & Retrieval
---

# Decay & Retrieval

Search results shouldn't treat a note from six months ago the same as one from yesterday. A conversation about "GATX infrastructure" last week is more relevant than a similar conversation from January — unless the January note has been accessed repeatedly, linked heavily, or sits at a critical point in the knowledge graph.

This might feel like overkill for an agent with 50 notes. It's not — it's designed for agents that run for **months or years**, accumulating thousands of notes, tens of thousands of messages, and hundreds of entity profiles. Without decay, every search query pays the cost of sifting through the entire history. A 6-month-old note about a resolved bug competes equally with yesterday's architecture decision for the same context window tokens. At scale, undifferentiated retrieval wastes the most expensive resource in the system: **context window space**.

Decay ensures that as the knowledge base grows, retrieval quality stays flat (or improves). Frequently-used, well-connected knowledge stays accessible. Stale, orphaned notes naturally fade. The agent's effective memory stays focused on what matters, even as the raw volume of stored information grows without bound.

Attaché's decay model draws from [ACT-R](http://act-r.psy.cmu.edu/) (Adaptive Control of Thought — Rational), a cognitive architecture developed by John Anderson at Carnegie Mellon University since the 1990s. ACT-R models how human declarative memory works: memories that are used frequently and recently stay accessible; unused memories fade. We also draw inspiration from [Ori-Mnemos](https://github.com/aayoawoyemi/Ori-Mnemos), an open-source agent memory system that implements ACT-R with graph-aware extensions.

## Base-Level Activation

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

## Metabolic Rates

Not all memory should decay at the same speed. A person's identity doesn't fade like yesterday's standup notes. Attaché applies **metabolic rate multipliers** to the decay parameter based on memory layer:

| Layer | Metabolic Rate | Effective Decay | Behavior |
|---|---|---|---|
| Entity (people, orgs) | 0.1× | Very slow | Identity barely fades |
| Knowledge (research, projects) | 1.0× | Normal | Relevance-driven lifecycle |
| Episodic (daily logs) | 2.0× | Fast | Recent context matters most |
| Activity (messages, transcripts) | 3.0× | Very fast | Burns hot, clears quickly |

The metabolic rate multiplies the base decay parameter: `effective_d = d × metabolic_rate`. An entity with metabolic rate 0.1 and base decay 0.5 has an effective decay of 0.05 — it takes roughly 10× longer to fade than a knowledge note.

## Spreading Activation

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

## Structural Protection

Some notes are structurally important even if rarely accessed. A project overview note that connects 15 sub-notes is a **bridge node** — removing it would fragment the graph.

Two mechanisms protect structural integrity:

**Structural boost**: Notes with high in-degree (many incoming links) decay slower. Each incoming link adds ~10% to effective stability, capped at 2×:

```
structural_boost = 1 + 0.1 × min(in_degree, 10)
```

**Bridge protection floor**: [Tarjan's algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_bridge-finding_algorithm) identifies articulation points — notes whose removal would disconnect the graph. These get a minimum vitality floor (default 0.5) regardless of access patterns, preventing them from being archived.

## Revival Spikes

Old notes that gain new connections get a **revival spike** — a 14-day boost that prevents newly-relevant dormant notes from being immediately archived:

```
revival_boost = e^(-0.2 × days_since_new_connection)
```

This handles the case where a 6-month-old research note suddenly becomes relevant because a new project links to it.

## Zone Classification

Notes are classified into zones based on their composite vitality score:

| Zone | Vitality | Behavior |
|---|---|---|
| **Active** | ≥ 0.6 | Fully accessible, prioritized in search results |
| **Stale** | 0.3 – 0.6 | Accessible but deprioritized in rankings |
| **Fading** | 0.1 – 0.3 | Candidate for archival, still searchable |
| **Archived** | &lt; 0.1 | Moved to archive, excluded from default search |

Zone transitions are automatic based on the vitality computation. The `prune` operation analyzes the full activation topology and identifies archive candidates, but always with dry-run as the default — no silent deletions.

## Implementation in Postgres

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

## Integration with Search

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

## Attribution

The decay model is inspired by:

- **[ACT-R](http://act-r.psy.cmu.edu/)** (Anderson & Lebiere, Carnegie Mellon University) — base-level activation, power law of forgetting, spreading activation, optimized learning approximation. ACT-R is open source under [LGPL v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html).
- **[Ori-Mnemos](https://github.com/aayoawoyemi/Ori-Mnemos)** (Aayo Awoyemi) — metabolic rates, structural protection via Tarjan's algorithm, zone classification, revival spikes. Ori-Mnemos is open source under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
