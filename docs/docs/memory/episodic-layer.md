---
sidebar_position: 1
sidebar_label: Episodic Memory
---

# Episodic Memory

:::tip TL;DR
Think of this as the agent's work journal. Every day it writes down what happened — decisions made, problems solved, things to remember. Over time, it reviews those notes and promotes the important stuff into a "greatest hits" file it reads at the start of every session. Raw daily notes fade; the curated highlights stick around.
:::

The episodic memory layer is the agent's temporal record — a stream of what happened, what was decided, and what matters. It's named after the cognitive science concept of [episodic memory](https://en.wikipedia.org/wiki/Episodic_memory): first-person, time-ordered experiences that consolidate over time into lasting knowledge.

**This is OpenClaw's native memory system.** Out of the box, every OpenClaw agent gets episodic memory — daily logs, a curated long-term file, and semantic search over both. OpenClaw also ships with a `memory/reference/` folder convention for stable reference documents, but that's a lightweight stopgap. Attaché replaces it with the [Knowledge Layer](./knowledge-layer) — a structured, Schema.org-typed, basic-memory-backed knowledge base with proper entity resolution and relational queries. If you're running Attaché, `reference/` is superseded; use the knowledge layer instead.

## Two Files, Two Purposes

**Daily notes** (`memory/YYYY-MM-DD.md`) capture the raw stream of each day's events. Session summaries, decisions made, problems encountered, tasks completed. These are written throughout the day as things happen, and they're intentionally rough. Think of them as a work journal — useful for recent context, but not something you'd read from six months ago.

**Long-term memory** (`memory/MEMORY.md`) is the curated version. The agent periodically reviews its daily notes and promotes the significant bits: key facts about people, recurring preferences, important decisions and their rationale, lessons learned. This file is what the agent reads at the start of every session to remember who it is and what it knows.

## Directory Structure

```
workspaces/main/
├── memory/
│   ├── MEMORY.md              # Curated long-term memory
│   ├── 2026-03-08.md          # Today's raw notes
│   ├── 2026-03-07.md          # Yesterday
│   ├── ...
│   └── reference/             # OpenClaw convention — superseded by Knowledge Layer
└── knowledge/                 # Attaché Knowledge Layer (see Knowledge Layer docs)
    ├── people/
    ├── organizations/
    ├── projects/
    └── ...
```

:::note
OpenClaw's `memory/reference/` folder is where vanilla OpenClaw agents store stable reference docs (setup notes, config details, project summaries). Attaché replaces this with the `knowledge/` directory — a structured, typed knowledge base backed by basic-memory and Postgres. Existing `reference/` files can be migrated to the appropriate knowledge type folder.
:::

## How Memory Gets Written

**During a session,** the agent writes to the current day's file as events happen. A decision gets made, a meeting is summarized, a preference is expressed — these go into `memory/YYYY-MM-DD.md` with enough context to be useful later.

**At compaction,** OpenClaw flushes the session's context into the daily notes. The current implementation is slow (sometimes several minutes), so the design calls for a fast foreground flush (under 30 seconds, just the key bullets) followed by a background agent that reviews the full session log and fills in gaps.

**During maintenance,** the agent reviews recent daily files and updates `MEMORY.md` with anything worth keeping long-term. This happens periodically — every few days during quiet moments, or when explicitly asked. Stale information gets pruned, new patterns get captured, and the file stays a manageable size.

## How Memory Gets Read

**Every session starts with memory.** The agent reads `MEMORY.md` for long-term context and the last couple of daily files for recent events. This gives it continuity without needing to process weeks of history.

**Semantic search fills the gaps.** OpenClaw's `memory_search` tool uses Gemini embeddings to search across all memory files. When the agent needs to recall something specific — "when did we decide to use Colima instead of Docker Desktop?" — it searches the full memory corpus, not just the files it read at startup.

**Search is hybrid, not just vector.** The memory search combines embedding similarity with keyword matching for better recall. Pure vector search misses exact terms; pure keyword search misses paraphrased concepts. The hybrid approach catches both.

## What Belongs in Memory

Memory is for temporal, subjective, and contextual information — the stuff that only makes sense with a "when" attached to it.

**Good memory content:** "Cedric decided to use Colima on March 5 because Docker Desktop has permission issues with the openclaw user's home directory." The decision, the date, the rationale, the context.

**Bad memory content:** "Cedric Hurst is the CEO of Spantree." That's a fact about an entity — it belongs in the knowledge layer as a person profile, not in temporal memory.

The rough heuristic: if it answers "what happened?" or "what did we decide?", it's memory. If it answers "who is this?" or "what is this thing?", it's knowledge.

## Memory Scoping

In multi-workspace setups, each workspace has its own `memory/` directory. The agent reads memory from its own workspace and can search across other workspaces with scope filters, but it only writes to its own.

**MEMORY.md is private by default.** It contains personal context about the human — family details, preferences, private decisions — that shouldn't leak into shared contexts like group chats or Discord channels. The agent loads it in direct conversations but skips it in shared spaces.
