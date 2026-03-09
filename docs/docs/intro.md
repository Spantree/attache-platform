---
slug: /
sidebar_position: 1
sidebar_label: What is Attaché?
---

# What is Attaché?

**Attaché is a turnkey platform for deploying personal AI agents powered by [OpenClaw](https://openclaw.ai).** You provision a Mac, run a single bootstrap command, and walk away with a fully configured AI agent connected to your calendars, inboxes, tools, and messaging surfaces.

## Why Attaché?

**Setting up an OpenClaw agent today requires tribal knowledge.** Which Homebrew packages to install, how to configure SSH, where credentials live, how to wire up integrations, how to get Supabase running with the right extensions — none of it is written down in one place. Every new agent deployment means rediscovering the same steps.

**Attaché captures all of that into repeatable Ansible playbooks.** One command provisions a bare macOS machine into a working agent host. A second, optional layer lets you personalize the agent with your own dotfiles, skills, and workspace configuration. The result is a setup that's reproducible, shareable, and takes minutes instead of hours.

## What You Get

**A dedicated Mac running macOS Tahoe** serves as the agent's home. It's hardened with key-only SSH authentication and connected to your tailnet for secure remote access.

**OpenClaw runs as the agent runtime,** installed globally with the gateway running as a launch agent that survives reboots. The agent wakes up, reads its personality from `SOUL.md`, and starts working.

**Supabase provides the data backbone.** Every Attaché agent gets a local Postgres instance with pgvector and pg_trgm extensions, powering the knowledge graph, activity log, and semantic search. It runs in Docker via Colima, managed by Compose.

**Ansible playbooks handle the entire setup** — from Homebrew installation to SSH hardening to service configuration. Run them again anytime to converge. They're idempotent by design.

## Who It's For

**Consultancies and teams** that want to give each member a personal AI agent will find Attaché removes the setup friction entirely. Define a shared config repo with your organization's defaults, and new agents inherit the same tooling, skills, and conventions.

**Individual practitioners** exploring AI copilots beyond chat windows get a reproducible setup they can rebuild from scratch. If your Mac dies, you're one bootstrap command away from being back online.

## Design Principles

**Turnkey by default.** One command takes you from bare macOS to a working agent. You shouldn't need to read a wiki to get started.

**Idempotent always.** Run the playbooks again anytime — after an update, after a config change, after you break something. They converge to the desired state without side effects.

**Opinionated but extensible.** Attaché ships sensible defaults (Tailscale for tunneling, Supabase for data, 1Password for secrets) but every choice can be overridden through the config repo layer.

**No magic, ever.** Every step is documented. Every file has a purpose you can inspect. You own the whole stack, and nothing is hidden behind abstractions you can't read.
