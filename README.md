# Attaché

**Turnkey AI agent platform powered by [OpenClaw](https://openclaw.ai).**

Attaché provisions a bare macOS machine into a fully configured AI agent host with a single command. No tribal knowledge required.

## Quick Start

```bash
# 1. Clone this repo
git clone https://github.com/Spantree/attache-platform.git
cd attache-platform

# 2. Copy your SSH key to the target Mac
ssh-copy-id <agent-user>@<target-host>

# 3. Bootstrap (base only)
uv run attache bootstrap <agent-user>@<target-host>

# 4. Bootstrap with a config repo
uv run attache bootstrap <agent-user>@<target-host> --config username/agent-name
```

### Install globally

```bash
uv tool install attache-platform
attache bootstrap evie@mac-mini.local --config divideby0/evie
```

## Prerequisites

- **Control machine:** [uv](https://docs.astral.sh/uv/) (`brew install uv`)
- **Target Mac:** macOS Tahoe (15.x), admin user, SSH enabled

## Documentation

Full docs at [docs.attache.dev](https://docs.attache.dev) / [attache-docs.pages.dev](https://attache-docs.pages.dev).

To run docs locally:

```bash
cd docs && bun install && bun run start
```

## Project Structure

```
├── pyproject.toml        # Python project config (Ansible deps, CLI entry point)
├── src/attache/          # attache CLI
├── ansible/              # Ansible playbooks and roles
│   ├── requirements.yml  # Galaxy collections
│   ├── playbooks/        # Main playbooks
│   ├── roles/            # Role definitions
│   ├── inventory/        # Host inventories
│   └── group_vars/       # Default variables
├── docker-compose.yml    # Base services (Supabase)
├── migrations/           # Postgres init scripts
└── docs/                 # Docusaurus documentation site
```

## License

MIT
