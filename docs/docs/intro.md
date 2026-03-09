# What is Attaché?

**Attaché is a turnkey platform for deploying personal AI agents powered by [OpenClaw](https://openclaw.ai).**

Think of it as a chief of staff in a box. You provision a Mac, run a single bootstrap command, and walk away with a fully configured AI agent — connected to your calendars, inboxes, tools, and messaging surfaces.

## Why Attaché?

Setting up an OpenClaw-backed agent today requires tribal knowledge: which Homebrew packages to install, how to configure SSH, where credentials live, how to wire up integrations. Attaché captures all of that into repeatable Ansible playbooks so anyone can stand up their own agent environment in minutes.

## What You Get

- **A dedicated Mac** running macOS Tahoe, hardened and configured for agent use
- **OpenClaw** installed and running as the agent runtime
- **Ansible playbooks** that handle the entire setup — from Homebrew to SSH keys to service configuration
- **Documentation** covering every decision, so you can customize without guessing

## Who It's For

- **Consultancies** that want to give each team member a personal AI agent
- **Teams** exploring AI copilots beyond chat windows
- **Individuals** who want a reproducible setup they can rebuild from scratch

## Design Principles

- **Turnkey.** One command to go from bare macOS to working agent.
- **Idempotent.** Run the playbooks again anytime — they converge, never break.
- **Opinionated but configurable.** Sensible defaults, override what you need.
- **No magic.** Every step is documented. You own the whole stack.
