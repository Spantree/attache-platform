---
sidebar_label: Blind Multi-Model Evaluation
---

# Blind Multi-Model Evaluation

## Problem

When an AI agent evaluates its own output, it has a systematic bias toward confirming its own work. A Claude-based agent reviewing Claude-generated code will find fewer issues than an independent reviewer would. Self-evaluation is better than nothing, but it creates a ceiling on quality assurance.

## Options Considered

1. **Single-model self-evaluation** -- the same model that generates output also reviews it
2. **Human review for everything** -- highest quality, doesn't scale
3. **Blind parallel evaluation** -- send the same prompt to two or three different models, compare results without revealing which model produced what

## Decision

Blind parallel evaluation from two to three different model providers (Anthropic, OpenAI, Google). The evaluating models don't know which model produced the original output or which models are co-evaluating.

"Blind" means two things: the evaluating model doesn't know the identity of the model that produced the work, and evaluating models don't see each other's assessments until all responses are collected. This eliminates anchoring bias (where a reviewer defers to a known-good model) and herding (where later reviewers converge on early assessments).

The orchestrator collects all evaluations, then synthesizes a final assessment. Disagreements between models are flagged for human review rather than auto-resolved. When two out of three models agree on an issue, it's likely real. When all three disagree, the uncertainty itself is the signal.

This pattern applies to code review, research synthesis, risk assessment, and any task where confidence in the output matters more than speed.

## Tradeoffs

- **Won.** Eliminates self-evaluation bias. Independent models catch different classes of errors.
- **Won.** Disagreement detection surfaces genuine ambiguity that single-model evaluation would miss.
- **Won.** Model-agnostic by design. Swap providers without changing behavior. If one provider has an outage, the system degrades to two-model evaluation rather than failing.
- **Lost.** Two to three times the API cost per evaluation. Acceptable for high-stakes operations (code review, security assessment), expensive for routine tasks.
- **Lost.** Latency increases -- you wait for the slowest model to respond. Mitigated by parallel execution, but still slower than single-model.
- **Lost.** Synthesizing disagreements is a hard problem. The orchestrator's merge logic is itself a source of potential error.
