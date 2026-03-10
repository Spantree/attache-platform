---
sidebar_position: 5
sidebar_label: Reports
---

# Reports

`schema.org/Report` — structured research notes with citations, knowledge graph annotations, and provider metadata. This is a standard Schema.org type extended with Attaché properties for the research workflow.

See [Research](/memory/research) for the full draft-first workflow and provider selection guide.

## Example

```markdown
---
type: schema.org/Report
id: e5f6a7b8-9012-34ab-cdef-567890123def
permalink: research/mcp-tools/search-quality-comparison
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
2. **Findings** — the actual research output (written during execution)
3. **Observations** — knowledge graph annotations extracted from findings
4. **Relations** — links to related entities
5. **References** — source citations with URLs

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
