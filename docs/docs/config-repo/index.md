---
sidebar_position: 4
---

# Config Repo Guide

Your config repo is where your agent becomes *yours*. It layers personalization on top of Attaché's base platform — extra packages, shell config, workspace files, custom Ansible playbooks, and bootstrap scripts.

## Getting Started

Create a new GitHub repo. It can be:

- **Public** — great for shared team configs (e.g., `yourorg/attache-config`)
- **Private** — for a specific agent with workspace files and credentials setup (e.g., `username/evie`)

## Directory Structure

All directories are optional. Attaché discovers and applies whatever it finds.

```
my-agent/
├── attache.config.json              # Feature flags and variable overrides
├── Brewfile                 # Additional Homebrew packages
├── mise/
│   └── config.toml          # Additional mise tools
├── shell/
│   ├── zshrc.local          # Sourced at end of .zshrc
│   └── starship.toml        # Prompt configuration
├── skills/                      # Shared across workspaces → ~/.openclaw/skills/
│   ├── code-review/
│   ├── knowledge/
│   └── sonarqube/
├── workspace/                   # Maps to ~/.openclaw/workspaces/main/
│   ├── SOUL.md              # Agent personality
│   ├── USER.md              # About the human
│   ├── AGENTS.md            # Workspace conventions
│   ├── TOOLS.md             # Local tool notes
│   ├── IDENTITY.md          # Agent identity
│   ├── HEARTBEAT.md         # Periodic task checklist
│   ├── memory/
│   │   └── MEMORY.md        # Long-term memory seed
│   └── knowledge/           # Entity profiles (basic-memory backed)
│       ├── people/
│       ├── organizations/
│       └── research/
├── ansible/
│   ├── group_vars/
│   │   └── all.yml          # Variable overrides (deep-merged with base)
│   ├── playbooks/           # Custom playbooks (run after base)
│   └── roles/               # Custom roles (available to your playbooks)
├── scripts/                 # Shell scripts (run in alphabetical order)
└── credentials/
    └── README.md            # Setup instructions (no actual secrets)
```

## attache.config.json Reference

```json
{
  "agent_name": "Evie",

  "backends": {
    "secrets": "onepassword",
    "tunnel": "tailscale",
    "database": "supabase"
  },

  "coding_agents": {
    "claude_code": {
      "max_sessions": 4,
      "default_model": "claude-sonnet-4-20250514"
    },
    "codex": true
  },

  "homebrew_extra": [
    "ffmpeg", "sox", "imagemagick", "ripgrep", "pandoc-crossref"
  ],

  "homebrew_casks_extra": ["1password"],

  "mise_extra": {
    "python": "3.13.3",
    "rust": "1.82.0"
  },

  "git": {
    "user_name": "Evie (Attaché)",
    "user_email": "evie@spantree.net"
  }
}
```

### backends

Each backend tells Attaché *what* you need, and Attaché handles the *how*:

| Backend | Value | What Attaché does |
|---|---|---|
| `secrets` | `onepassword` | Installs 1Password CLI, stores service account token in macOS Keychain, configures `op` for non-interactive use |
| `tunnel` | `tailscale` | Installs Tailscale, prompts for auth key or interactive login |
| `database` | `supabase` | Runs local Supabase via Docker Compose (pgvector, pg_trgm enabled) |

Future backend options (not yet implemented):
- `secrets: vault` (HashiCorp Vault), `secrets: doppler`
- `tunnel: cloudflare` (Cloudflare Tunnel)

### Shell configuration

Attaché's base ensures zsh is the default shell and sources `~/.zshrc.local` if it exists. Beyond that, **shell config is entirely yours** — put your `zshrc`, `zprofile`, and `zshenv` files in your config repo's `shell/` directory.

The base does *not* install Oh My Zsh, Starship, or any shell framework. If you want them, add the installation to your `Brewfile`, `scripts/`, or Ansible playbooks in the config repo.

## Workspace Files

Everything in `workspace/` gets copied to `~/.openclaw/workspaces/main/` on the target. Everything in `skills/` gets copied to `~/.openclaw/skills/` (shared across all workspaces).

**At minimum, you'll want:**

- **SOUL.md** — who the agent is (personality, voice, boundaries)
- **USER.md** — who the human is (name, preferences, context)

**Optional but recommended:**

- **AGENTS.md** — workspace conventions and behavioral rules
- **TOOLS.md** — notes about local tool configurations
- **IDENTITY.md** — agent name, avatar, emoji

## Skills

Skills live at the config repo root in `skills/`, not inside `workspace/`. This is intentional — skills are shared resources that can be linked into multiple workspaces.

During bootstrap, Ansible copies `skills/` to `~/.openclaw/skills/`. If you later add additional workspaces, they can all reference the same skill set.

## Custom Ansible

Your config repo can include full Ansible playbooks and roles. These run *after* the base bootstrap completes, so you can assume all base tooling is available.

### Example: Credentials Playbook

```yaml
# ansible/playbooks/credentials.yml
---
- name: Set up agent credentials
  hosts: all
  roles:
    - role: onepassword-bootstrap
      tags: [credentials]
```

```yaml
# ansible/roles/onepassword-bootstrap/tasks/main.yml
---
- name: Sign in to 1Password CLI
  ansible.builtin.shell: |
    eval $(op signin)
  environment:
    OP_SERVICE_ACCOUNT_TOKEN: "{{ op_service_account_token }}"

- name: Extract GitHub token
  ansible.builtin.shell: |
    op read "op://Openclaw/EVIE - GitHub PAT/credential"
  register: github_token

- name: Configure npmrc for GitHub Packages
  ansible.builtin.template:
    src: npmrc.j2
    dest: "{{ ansible_env.HOME }}/.npmrc"
    mode: "0600"
```

### Example: group_vars Override

```yaml
# ansible/group_vars/all.yml
# These values are deep-merged with the base group_vars.
# Your values win on conflict.

node_version: "22"
openclaw_version: "latest"

# Add packages to the base list
homebrew_packages:
  - git
  - jq
  - gh
  - mise
  - tailscale
  - trash
  # Your additions:
  - ffmpeg
  - ripgrep
  - sox
```

## Bootstrap Scripts

Shell scripts in `scripts/` run in alphabetical order after Ansible completes. Use numeric prefixes to control order:

```bash
#!/usr/bin/env bash
# scripts/01-tailscale.sh
# Join the tailnet (requires auth key)

tailscale up --authkey="${TAILSCALE_AUTH_KEY}"
```

```bash
#!/usr/bin/env bash
# scripts/02-github-auth.sh
# Authenticate GitHub CLI

gh auth login --with-token <<< "${GITHUB_TOKEN}"
```

## Public vs Private Repos

| | Public Config | Private Config |
|---|---|---|
| **Use case** | Shared team defaults | Specific agent setup |
| **Contains workspace files** | Usually not | Yes (SOUL.md, skills, etc.) |
| **Contains credentials** | Never | Never (use 1Password/vault) |
| **Example name** | `myorg/attache-config` | `username/agent-name` |
| **Auth required** | No | Yes (SSH key or GH token) |

## Template Repository

We provide a template config repo you can fork as a starting point:

```bash
gh repo create my-agent --template Spantree/attache-config-template --private
```

*(Template coming soon)*
