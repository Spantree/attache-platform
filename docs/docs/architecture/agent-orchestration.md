---
sidebar_label: Agent Orchestration
sidebar_position: 2
---

# Agent Orchestration

Evie Platform's orchestration layer is runtime-agnostic. Any agent that can read files, write files, and commit to Git works as a participant. The coordination layer is the Git repository itself -- not a proprietary protocol, not a message queue, not a shared database.

## Runtime-Agnostic Delegation

The orchestrating agent (typically OpenClaw) delegates tasks to coding agents without coupling to a specific runtime. Claude Code, Codex, Gemini CLI, Aider, or a local model running via Ollama -- all participate through the same interface:

1. The orchestrator writes a brief (a markdown file describing the task, context, and constraints)
2. The coding agent picks up the brief, does the work, and commits the result
3. The orchestrator reads the commit, evaluates the output, and decides what's next

This works because the contract is files and Git, not an API. A coding agent doesn't need a plugin, SDK, or integration to participate. It needs a shell, a file system, and Git.

The `evie-orchestrate` bounded context manages delegation lifecycle: brief generation, session launch, progress monitoring, and result collection. It's the switchboard, not the worker.

## Git as Coordination Layer

Git is the universal coordination layer because every coding agent already speaks it. Branches isolate parallel work. Commits provide atomic checkpoints. Diffs show exactly what changed. Merge conflicts surface when two agents touch the same code.

The orchestrator uses Git worktrees to give each coding agent an isolated copy of the repository. Agents work in parallel on separate branches without stepping on each other. When work completes, the orchestrator evaluates the branch and decides whether to merge, request changes, or discard.

This pattern scales to any number of concurrent agents. The coordination overhead is Git's merge machinery, which handles the hard problems (conflict detection, three-way merge, history linearization) that a custom protocol would need to reimplement.

## Multi-Model Evaluation

When output quality matters more than speed, the orchestrator runs blind parallel evaluation from two to three different model providers. See [Blind Multi-Model Evaluation](./design-decisions/blind-multi-model) for the full design decision.

In practice, this applies to:

- **Code review** -- send the same diff to Claude, GPT, and Gemini. Disagreements surface real issues that single-model review would miss.
- **Research synthesis** -- three models independently summarize source material. Overlapping conclusions are high-confidence; divergent conclusions need human judgment.
- **Risk assessment** -- independent security evaluations of a proposed change. Unanimous "safe" is a stronger signal than one model saying "safe."

The orchestrator collects all evaluations before synthesizing a result. Models don't see each other's assessments. This eliminates anchoring and herding biases.

## Local Reflection

Quantized local models (Llama 3, Mistral, Phi) running on Apple Silicon handle a specific class of work: extracting procedural knowledge from session logs.

After a coding session, the local model reads the session transcript and extracts patterns: "When reviewing TypeScript, always check for unhandled promise rejections." "This codebase uses barrel exports -- follow that convention." These observations become candidate entries for procedural memory (SKILL.md updates or new skills).

Local reflection runs on-device with no API calls. The session logs -- which may contain sensitive code, credentials references, or internal discussion -- never leave the machine. The local model's output is lower quality than a frontier model, but the privacy tradeoff is worth it for this use case.

The Dream Cycle (overnight consolidation) uses a mix of local and API-based models depending on the task. Privacy-sensitive consolidation runs locally; quality-critical synthesis uses frontier models.

## Tmux as Session Management

Each coding agent runs in a tmux session. Tmux provides the session lifecycle that agent orchestration needs:

- **Named sessions** -- `evie-cc-auth-rewrite`, `evie-codex-review-42`. Find any agent's work by name.
- **Detached execution** -- agents run in the background. The orchestrator launches a session and checks back later.
- **Output capture** -- tmux's scrollback buffer captures the full session transcript for post-hoc analysis and local reflection.
- **Multiplexing** -- multiple agents run concurrently in separate sessions on the same machine.

The dispatch harness creates a tmux session, injects the brief, starts the coding agent, and monitors for completion. When the agent finishes (detected by process exit or a sentinel file), the harness collects the results and notifies the orchestrator.

This is intentionally low-tech. Tmux is battle-tested, available on every Unix system, and requires zero infrastructure. The alternative -- a custom daemon managing agent processes -- would add complexity without meaningful benefit.
