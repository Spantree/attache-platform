---
sidebar_position: 5
sidebar_label: Reports
---

# Reports

`schema.org/Report` — structured research notes with citations, knowledge graph annotations, and provider metadata. This is a standard Schema.org type extended with Attaché properties for the research workflow.

See [Research Reports](./research) for the full draft-first workflow and provider selection guide.

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
much slower than one accessed once, even at the same age. This is
fundamentally different from simple exponential decay...

## Buffer Decay Extensions

Thomson, Bennati & Lebiere (2014) extended ACT-R's short-term
memory model with buffer decay, showing how spreading activation
provides implicit contextual information. This is relevant to our
design: when a note is accessed, its neighbors in the knowledge
graph should receive a vitality boost via spreading activation...

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

### Research Modes

| Mode | How it works |
|---|---|
| `deep_research` | Autonomous report generation — provider executes independently and returns a complete report (Exa Deep Research, Perplexity) |
| `adaptive` | Agent-driven multi-tool exploration — the agent calls search, scrape, and documentation tools in sequence, adapting based on findings |
| `external` | Import from external AI tools — user conducts research in Claude.ai or ChatGPT and imports the results |

## Document Structure

Research notes follow a consistent internal structure:

1. **Instructions** — context, scope, and specific questions (written during draft phase)
2. **Report** — the actual research output (written during execution)
3. **Annotations** — knowledge graph metadata, grouped into three subsections:
   - **Observations** — structured annotations extracted from findings
   - **Relations** — links to related entities via `[[wiki-links]]`
   - **References** — source citations with URLs

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
