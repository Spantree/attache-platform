# Specifications

Detailed specifications for each Attaché component.

## Available Specs

- [**Skill Manifests**](./skill-manifests.md) — how skills declare dependencies, strategies, and optional Docker services
- [**Service Architecture**](./service-architecture.md) — Docker Compose as the service layer, Colima runtime, Supabase as required infrastructure

## Planned Specs

- **Workspace Structure** — `workspaces/main/` layout, memory vs knowledge separation, basic-memory Postgres backend
- **Bootstrap Playbook** — step-by-step breakdown of the base platform provisioning
- **Ansible Role Catalog** — each role's purpose, variables, and defaults
- **Credential Management** — 1Password CLI integration, secret storage patterns
- **Agent Configuration** — SOUL.md, USER.md, workspace conventions
- **Config Repo Merging** — detailed merge semantics for group_vars, compose files, workspace overlays
