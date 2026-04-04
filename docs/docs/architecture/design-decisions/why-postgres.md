---
sidebar_label: Why Postgres
---

# Why Postgres

## Problem

Evie Platform needs search (vector, full-text, fuzzy), time-series storage, graph traversal, and relational data. The typical answer is to run separate databases for each concern: Pinecone for vectors, Elasticsearch for full-text, Neo4j for graphs, InfluxDB for time-series.

## Options Considered

1. **Polyglot persistence** -- separate databases per concern (Pinecone + Elasticsearch + Neo4j + InfluxDB + Postgres)
2. **Postgres with extensions** -- single database using pgvector, ParadeDB (BM25), TimescaleDB and pg_trgm
3. **SQLite with extensions** -- embedded database, simpler ops but weaker extension ecosystem

## Decision

Postgres with four extensions on a single instance, deployed via Supabase.

**JSONB** handles semi-structured data (activity logs, entity metadata) without separate document stores. **pgvector** provides cosine-distance similarity search over embeddings. **ParadeDB** adds BM25 full-text search with TF-IDF weighting. **pg_trgm** handles fuzzy matching for typos and partial names. **TimescaleDB** powers time-series queries for the activity log and memory vitality decay.

Graph traversal uses recursive CTEs rather than a graph database. Benchmarks show CTEs run 40x faster than Apache AGE for our query patterns (two to three hops through entity relations). AGE adds a custom query language and a maintenance burden for marginal benefit at our scale.

Supabase wraps Postgres with Auth, Realtime subscriptions, a management dashboard, and managed migrations. One `docker compose up` gives you the full stack.

## Tradeoffs

- **Won.** One backup strategy, one connection pool, one set of migrations. Operational simplicity at the cost of Postgres expertise being a hard requirement.
- **Lost.** Dedicated vector databases like Pinecone optimize for billion-scale similarity search. Evie Platform's per-agent corpus is small enough that pgvector performs well, but this decision would need revisiting at enterprise scale.
- **Lost.** No native graph query language. CTEs are powerful but verbose compared to Cypher. Acceptable because graph queries are a small fraction of total queries.
