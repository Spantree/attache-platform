---
sidebar_label: Design Decisions
sidebar_position: 1
---

# Design Decisions

Each page in this section documents a key architectural choice using a consistent format: the problem, the options considered, the decision, and the tradeoffs.

These are not retrospective justifications. They capture the reasoning at the time the decision was made, so future contributors understand the constraints and can revisit decisions when the constraints change.

## Decisions

- **[Why Postgres](./why-postgres)** -- single database with JSONB, pgvector, ParadeDB, TimescaleDB and pg_trgm. Graph traversal via recursive CTEs.
- **[Why Mac Mini](./why-mac-mini)** -- per-user dedicated hardware, Apple Silicon for local inference, physical data sovereignty.
- **[Why Bun](./why-bun)** -- one language ecosystem, native TypeScript, Python only as escape hatch.
- **[Why Discord](./why-discord)** -- named threads, auto-hide, personal server model. Slack and others come later.
- **[Why Not Neo4j](./why-not-neo4j)** -- heavyweight Java dependency, CTEs outperform AGE by 40x for our query patterns.
- **[Why Local First](./why-local-first)** -- progressive trust, no cloud dependency for core ops, network for enrichment only.
- **[Blind Multi-Model Evaluation](./blind-multi-model)** -- parallel eval from two to three models eliminates self-evaluation bias.
