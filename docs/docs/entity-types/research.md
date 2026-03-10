---
sidebar_position: 5
sidebar_label: Research Reports
---

# Research Reports

`schema.org/Report` — structured research notes with citations, knowledge graph annotations, and provider metadata.

Research is a first-class workflow in the knowledge layer. When the agent investigates a topic — comparing tools, evaluating architectures, gathering competitive intelligence — the output is a Report entity with a consistent internal structure.

## Example

```markdown
---
type: schema.org/Report
id: e5f6a7b8-9012-34ab-cdef-567890123def
permalink: research/agent-memory/act-r-decay-models
title: "ACT-R Memory Decay in Agent Architectures"
about: applying ACT-R cognitive decay models to AI agent memory systems
mode: adaptive
status: completed
providers:
  exa:
    tool_calls: 3
    model: exa-research-fast
tags:
  - research
  - memory
  - act-r
  - cognitive-science
---

# Instructions

## Context

We're designing a decay model for Attaché's memory system and need
to understand how ACT-R's base-level activation applies to agent
memory retrieval — particularly the power law of forgetting and
how frequency/recency interact.

## Questions

1. How does ACT-R's base-level activation formula work?
2. What optimizations exist for computing activation at scale?
3. How have other agent systems adapted ACT-R for memory decay?

# Report

## Base-Level Activation

ACT-R models declarative memory using base-level activation, where
each memory chunk's accessibility depends on how often and how
recently it's been accessed. The formula combines a logarithmic
sum of recency-weighted access events with a decay parameter,
producing a power law of forgetting that matches human recall data.

Anderson & Lebiere's work at Carnegie Mellon established that both
frequency and recency matter — a note accessed 50 times decays
much slower than one accessed once, even at the same age...

## Buffer Decay Extensions

Thomson, Bennati & Lebiere (2014) extended ACT-R's short-term
memory model with buffer decay, showing how spreading activation
provides implicit contextual information...

# Annotations

## Observations

- [finding] ACT-R base-level activation combines frequency and recency via power law #act-r #memory
- [finding] Optimized O(1) approximation avoids iterating over access history #performance
- [recommendation] Apply metabolic rate multipliers for different memory layers #architecture

## Relations

- informs [[projects/attache]]
- related_to [[research/agent-memory/ori-mnemos-review]]

## References

- [Anderson & Lebiere — The effect of memory decay on predictions from changing categories](http://act-r.psy.cmu.edu/?p=13636&post_type=publications)
- [Thomson et al. — Extending the Influence of Contextual Information in ACT-R using Buffer Decay](http://act-r.psy.cmu.edu/wordpress/wp-content/uploads/2015/09/CogSci-2014-Final-Extending-the-Influence-of-Contextual-Information-in-ACT-R-using-Buffer-Decay.pdf)
- [Ori-Mnemos — Agent memory with ACT-R and graph-aware extensions](https://github.com/aayoawoyemi/Ori-Mnemos)
```

## Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Report title (required) |
| `about` | string | Subject matter (Schema.org field) |
| `mode` | enum | `deep_research`, `adaptive`, or `external` |
| `status` | enum | `draft`, `pending`, `completed`, or `failed` |
| `providers` | Record | Provider metadata: tool calls, model, cost |
| `tags` | string[] | Classification tags |

## Document Structure

Research notes follow a consistent internal structure:

1. **Instructions** — context, scope, and specific questions (written during draft phase)
2. **Report** — the actual research output (written during execution)
3. **Annotations** — knowledge graph metadata:
   - **Observations** — structured annotations extracted from findings
   - **Relations** — links to related entities via `[[wiki-links]]`
   - **References** — source citations with URLs

## Research Modes

| Mode | How it works | Example providers |
|---|---|---|
| `deep_research` | Autonomous report generation — provider executes independently and returns a complete report | Exa Deep Research, Perplexity |
| `adaptive` | Agent-driven multi-tool exploration — the agent calls search, scrape, and documentation tools in sequence | Firecrawl, Exa search, GitHub CLI, Apollo |
| `external` | Import from external AI tools — user conducts research elsewhere and imports the results | Claude Deep Research, ChatGPT share links |

## Draft-First Workflow

Research follows a **draft-first** pattern where the plan is written to the knowledge base *before* execution:

1. **Scope** — Agent asks clarifying questions to refine the topic
2. **Draft** — Agent writes a note with `status: draft` containing instructions and questions
3. **Review** — User reviews, adds inline feedback
4. **Execute** — User selects provider/model, research runs with finalized instructions
5. **Persist** — Report, annotations, and references are written to the note

## Provider Selection Guide

| Query type | Recommended provider | Why |
|---|---|---|
| Semantic/conceptual questions | Exa Deep Search | Neural understanding, query expansion |
| Exact keywords, error codes | Firecrawl | Search operators, keyword matching |
| Known URL extraction | Firecrawl scrape | Best content extraction |
| People and organizations | Apollo | Structured business data |
| Library/API documentation | Ref | Optimized for docs |
| GitHub code and issues | GitHub CLI | Direct access |

## Folder Structure

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

<details>
<summary>Zod schema</summary>

```typescript
export const ReportSchema = z.object({
  type: z.literal("schema.org/Report"),
  title: z.string(),
  about: z.string().optional(),
  mode: z.enum(["deep_research", "adaptive", "external"]).optional(),
  status: z.enum(["draft", "pending", "completed", "failed"]).optional(),
  providers: z.record(z.object({
    tool_calls: z.number(),
    model: z.string().optional(),
    cost: z.number().optional(),
  })).default({}),
  tags: z.array(z.string()).default([]),
});
```

</details>
