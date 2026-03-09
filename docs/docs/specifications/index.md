---
sidebar_position: 5
---

# Specifications

Detailed specifications for each Attaché component.

## Available Specs

- [**Skill Manifests**](./skill-manifests.md) — how skills declare dependencies, strategies, and optional Docker services
- [**Service Architecture**](./service-architecture.md) — Docker Compose as the service layer, Colima runtime, Supabase as required infrastructure

## Planned Specs

**Workspace Structure** will cover the `workspaces/main/` layout, the separation between memory and knowledge directories, and how basic-memory indexes knowledge files into Postgres.

**Bootstrap Playbook** will provide a step-by-step breakdown of every base platform role — what it installs, what it configures, and what variables control its behavior.

**Credential Management** will document the 1Password CLI integration, how service account tokens are stored in macOS Keychain, and patterns for injecting secrets into the agent's environment.

**Agent Configuration** will detail the workspace convention files — SOUL.md, USER.md, AGENTS.md — and how they shape the agent's behavior across sessions.
