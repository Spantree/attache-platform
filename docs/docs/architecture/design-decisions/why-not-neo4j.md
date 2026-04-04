---
sidebar_label: Why Not Neo4j
---

# Why Not Neo4j

## Problem

Evie Platform's memory system stores entity relations (people linked to organizations, projects linked to repositories, meetings linked to participants). Graph databases are the conventional tool for this. Neo4j is the most prominent option.

## Options Considered

1. **Neo4j** -- purpose-built graph database with Cypher query language
2. **Apache AGE** -- Postgres extension that adds openCypher support
3. **Recursive CTEs in Postgres** -- native SQL graph traversal, no extensions needed

## Decision

Recursive CTEs in standard Postgres. No Neo4j, no Apache AGE.

Neo4j is a heavyweight dependency. It's a Java application that needs its own JVM, its own memory allocation, its own backup strategy, and its own monitoring. For a per-agent platform that already runs Postgres with four extensions queued (pgvector, ParadeDB, TimescaleDB, pg_trgm), adding a separate database server for graph queries is hard to justify.

Apache AGE was evaluated as a lighter alternative -- it adds Cypher support to Postgres. But benchmarks showed recursive CTEs outperform AGE by roughly 40x for Evie Platform's typical graph patterns (two to three hops through entity relations). AGE adds a custom query language and catalog overhead without a performance benefit at this scale.

Recursive CTEs handle the graph traversal patterns Evie Platform needs: "find all people connected to this organization," "trace the meeting chain for this project," "show me everything two hops from this entity." The queries are verbose compared to Cypher but they run on the same Postgres instance that handles everything else.

## Tradeoffs

- **Won.** No additional database to operate, monitor, back up, or patch. One Postgres instance handles relational, vector, full-text, time-series, and graph queries.
- **Won.** 40x faster than AGE for typical two to three hop traversals.
- **Won.** No Java dependency. Evie Platform's runtime stack stays TypeScript + Postgres.
- **Lost.** Cypher is more expressive than recursive CTEs for complex graph patterns. If query complexity grows beyond three to four hops, CTEs become unwieldy.
- **Lost.** No visual graph explorer out of the box. Neo4j's browser is genuinely useful for exploring relationships. Evie Platform would need a custom visualization if that becomes a need.
