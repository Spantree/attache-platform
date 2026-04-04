---
sidebar_label: Why Bun
---

# Why Bun

## Problem

Evie Platform scripts, skills, and tooling need a runtime. OpenClaw itself runs on Node.js. The question is whether to standardize on Node, adopt Bun, or split between TypeScript and Python.

## Options Considered

1. **Node.js only** -- the runtime OpenClaw already uses
2. **Bun** -- binary drop-in replacement for Node with built-in TypeScript, bundler, and package manager
3. **Python for tooling, Node for runtime** -- common in AI/ML ecosystems
4. **Mixed Bun + Python** -- Bun as primary, Python as escape hatch

## Decision

Bun as the primary runtime for all Evie Platform scripts, skills, and tooling. Python only as an escape hatch for workloads that have no TypeScript equivalent (e.g., OpenCV keyframe extraction from video).

One language ecosystem eliminates the dev-tool drift that comes from maintaining both `pyproject.toml` and `package.json`, both `pip` and `npm`, both `ruff` and `eslint`. Bun is a binary drop-in: it runs TypeScript natively, bundles without a separate tool, and manages packages faster than npm.

Bun's built-in test runner, HTTP server, and file I/O APIs reduce the dependency count for common operations. A skill script that needs to make HTTP calls and parse JSON doesn't need axios or node-fetch.

## Tradeoffs

- **Won.** Single language ecosystem for the entire platform. Every contributor needs to know TypeScript, not TypeScript and Python.
- **Won.** Native TypeScript execution -- no compile step, no tsconfig complexity for scripts.
- **Won.** Faster package installs and script startup vs. Node.
- **Lost.** Bun's Node.js compatibility is not 100%. Some npm packages with native addons or Node-specific APIs may not work. Mitigated by falling back to Node for those cases.
- **Lost.** Python's ML/AI library ecosystem is unmatched. The escape hatch exists because some tasks (video processing, specialized ML inference) have no viable TypeScript alternative.
