---
sidebar_position: 7
sidebar_label: Research
---

# Research

Research is a first-class workflow in the knowledge layer. When the agent investigates a topic — comparing tools, evaluating architectures, gathering competitive intelligence — the output is a structured research note with citations, knowledge graph annotations, and provider metadata.

Research notes use `schema.org/Report` with Attaché extensions. See the [Type Registry](./type-registry) for the full Zod schema.

## Research Modes

Research notes are produced by different backends, identified by the `mode` field:

| Mode | How it works | Example providers |
|---|---|---|
| `deep_research` | Autonomous report generation — provider executes independently and returns a complete report | Exa Deep Research, Perplexity |
| `adaptive` | Agent-driven multi-tool exploration — the agent calls search, scrape, and documentation tools in sequence, adapting based on findings | Firecrawl, Exa search, GitHub CLI, Apollo |
| `external` | Import from external AI tools — user conducts research in Claude.ai, ChatGPT, or Perplexity and imports the results | Claude Deep Research, ChatGPT share links |

## Research Note Structure

```markdown
---
type: schema.org/Report
title: "Search Quality Comparison: Firecrawl vs Exa"
about: search quality for coding research queries
mode: adaptive
status: completed
providers:
  firecrawl:
    tool_calls: 12
  exa:
    tool_calls: 1
tags:
  - research
  - search-quality
  - exa
  - firecrawl
---

# Instructions

## Context

FTK uses multiple search tools. We need empirical data on
search quality differences for coding research queries.

## Questions

1. For programming/API queries, which tool returns more relevant results?
2. What exactly is "Deep Search" in Exa?
3. How do the tools handle nuanced semantic queries?

# Findings

## Result Relevance

Exa demonstrates superior performance on semantic queries due to
its neural search architecture (94% accuracy on SimpleQA)...

## Observations

- [benchmark] Exa achieves 94% accuracy on SimpleQA #search-quality #exa
- [recommendation] Use Exa for semantic queries, Firecrawl for exact keywords #tool-selection

## Relations

- extends [[research/web-search-tools-comparison]]
- informs [[projects/attache]]

## References

- [Exa: Web Search API Evals](https://exa.ai/blog/api-evals)
- [Patronus AI: Exa vs Bing](https://www.patronus.ai/case-studies/exa-vs-bing)
```

## Draft-First Workflow

Research follows a **draft-first** pattern where the research plan is written to the knowledge base *before* execution:

1. **Scope** — Agent asks clarifying questions to refine the topic
2. **Draft** — Agent writes a research note with `status: draft` containing instructions, context, and specific questions
3. **Review** — User reviews the plan in their editor, adds inline feedback via markdown comments
4. **Refine** — Agent processes feedback, updates the draft (repeat until approved)
5. **Execute** — User selects provider/model, research runs with finalized instructions
6. **Persist** — Findings, observations, relations, and references are written to the note

This ensures research instructions are persisted before any work happens, the user can refine scope before incurring API costs, and the full research trail is preserved for future reference.

## Provider Selection Guide

| Query type | Recommended provider | Why |
|---|---|---|
| Semantic/conceptual questions | Exa Deep Search | Neural understanding, query expansion |
| Exact keywords, error codes | Firecrawl | Search operators, keyword matching |
| Site-specific search | Firecrawl with `site:` | Precise filtering |
| Known URL extraction | Firecrawl scrape | Best content extraction |
| Multi-hop research | Exa Deep Search | Automatic query expansion |
| People and organizations | Apollo | Structured business data |
| Library/API documentation | Ref | Optimized for docs |
| GitHub code and issues | GitHub CLI | Direct access |

## Folder Structure

Research notes live under `knowledge/research/` organized by topic:

```
knowledge/research/
├── ai-agents/
│   ├── coding-agent-taxonomy.md
│   └── agent-memory-patterns.md
├── mcp-tools/
│   └── search-quality-comparison.md
└── infrastructure/
    └── colima-vs-docker-desktop.md
```
