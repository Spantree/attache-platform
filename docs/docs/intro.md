---
slug: /
sidebar_position: 1
sidebar_label: What is Evie Platform?
---

# What is Evie Platform?

**Evie Platform is an opinionated distribution of [OpenClaw](https://openclaw.ai) that turns the open-source agent runtime into a personal AI agent.** OpenClaw is the kernel. Evie Platform is the full operating system: provisioning, memory, security, skills, and identity governance layered on top.

You provision a Mac, run a single bootstrap command, and walk away with a fully configured AI agent connected to your calendars, inboxes, tools, and messaging surfaces.

## The Relationship to OpenClaw

OpenClaw provides the agent runtime: a gateway daemon, message routing, tool execution, and the SOUL.md personality system. It's the fastest-growing open-source project in history (343k+ GitHub stars), and Jensen Huang called it "the new computer" at GTC 2026.

Evie Platform builds on that foundation with three layers OpenClaw doesn't provide:

- **Ego** -- an executive layer that governs identity, behavioral policy, and sub-agent orchestration. SOUL.md gives an agent personality; Ego gives it judgment.
- **5-Layer Memory** -- structured recall that replaces OpenClaw's flat file memory with episodic, identity, topical, procedural, and artifact layers, all built on an activity log foundation.
- **Trust and Security** -- progressive autonomy, agent-blind credential injection, and a four-tier trust model that treats security as a graduated dial, not a binary switch.

Think of it this way: OpenClaw gives you the engine. Evie Platform gives you the car.

![Evie Platform Architecture](/img/openclaw-to-evie-evolution.png)

## Why Evie Platform?

**Setting up an OpenClaw agent today requires tribal knowledge.** Which Homebrew packages to install, how to configure SSH, where credentials live, how to wire up integrations, how to get Supabase running with the right extensions -- none of it is written down in one place. Every new agent deployment means rediscovering the same steps.

**Evie Platform captures all of that into repeatable Ansible playbooks.** One command provisions a bare macOS machine into a working agent host. A second, optional layer lets you personalize the agent with your own dotfiles, skills, and workspace configuration. The result is a setup that's reproducible, shareable, and takes minutes instead of hours.

## What You Get

**A dedicated Mac running macOS Tahoe** serves as the agent's home. It's hardened with key-only SSH authentication and connected to your tailnet for secure remote access.

**OpenClaw runs as the agent runtime,** installed globally with the gateway running as a launch agent that survives reboots. The agent wakes up, reads its personality from `SOUL.md`, and starts working.

**Supabase provides the data backbone.** Every Evie Platform agent gets a local Postgres instance with pgvector, ParadeDB (BM25), and pg_trgm extensions, powering the five-layer memory system, activity log, and hybrid search (vector similarity + full-text + fuzzy matching). It runs in Docker via Colima, managed by Compose.

**Ansible playbooks handle the entire setup** -- from Homebrew installation to SSH hardening to service configuration. Run them again anytime to converge. They're idempotent by design.

## Who It's For

**Consultancies and teams** that want to give each member a personal AI agent will find Evie Platform removes the setup friction entirely. Define a shared config repo with your organization's defaults, and new agents inherit the same tooling, skills, and conventions.

**Individual practitioners** exploring AI copilots beyond chat windows get a reproducible setup they can rebuild from scratch. If your Mac dies, you're one bootstrap command away from being back online.

## Design Principles

**Turnkey by default.** One command takes you from bare macOS to a working agent. You shouldn't need to read a wiki to get started.

**Idempotent always.** Run the playbooks again anytime -- after an update, after a config change, after you break something. They converge to the desired state without side effects.

**Opinionated but extensible.** Evie Platform ships sensible defaults (Tailscale for tunneling, Supabase for data, 1Password for secrets) but every choice can be overridden through the config repo layer.

**Local-first sovereignty.** Everything runs on your hardware. No data leaves the box unless the agent explicitly sends it. You own the full stack.

**No magic, ever.** Every step is documented. Every file has a purpose you can inspect. Nothing is hidden behind abstractions you can't read.
