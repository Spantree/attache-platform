---
sidebar_label: Why Local First
---

# Why Local First

## Problem

AI agent platforms face a fundamental tension: cloud services offer convenience and scale, but they require sending your data to someone else's infrastructure. For a personal agent with access to your email, calendar, credentials, and file system, the data sovereignty question is not abstract.

## Options Considered

1. **Cloud-hosted** -- agent runs on managed infrastructure (AWS, GCP, or a SaaS platform)
2. **Hybrid** -- agent runs locally, memory and state stored in cloud
3. **Local-first** -- everything runs on your hardware, network used only for enrichment

## Decision

Local-first architecture with a progressive trust model. The agent sees your data locally. No cloud dependency for core operations. Network connectivity is used for enrichment only: LLM API calls, web fetches, integration syncs.

The progressive trust model means the agent starts with no network access to external services and gains it incrementally as you configure integrations. Your Postgres instance, memory files, knowledge graph, and activity log all live on your Mac. If you disconnect from the internet, the agent still works -- it just can't call LLM APIs or sync external services.

This design aligns with the dedicated Mac mini model. The hardware is yours. The data is yours. The agent process runs under a restricted OS user on hardware you physically control.

## Tradeoffs

- **Won.** Data sovereignty -- your conversations, credentials, and knowledge graph never leave your hardware unless you explicitly configure an integration to sync them.
- **Won.** Latency -- local Postgres queries are faster than round-trips to a cloud database. Memory retrieval and knowledge graph lookups run in single-digit milliseconds.
- **Won.** Availability -- core agent functionality works offline. No dependency on cloud uptime for local operations.
- **Lost.** No automatic backups without configuration. Cloud-hosted solutions handle this by default. You need to set up your own backup strategy (Time Machine, rsync, or Restic).
- **Lost.** No multi-device sync out of the box. Your agent's state lives on one machine. Accessing it from elsewhere requires Tailscale or similar remote access.
- **Lost.** Compute is bounded by your hardware. Cloud solutions can scale up for heavy workloads. A Mac mini has fixed CPU, memory, and storage.
