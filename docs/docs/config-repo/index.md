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
├── attache.yml              # Feature flags and variable overrides
├── Brewfile                 # Additional Homebrew packages
├── mise/
│   └── config.toml          # Additional mise tools
├── shell/
│   ├── zshrc.local          # Sourced at end of .zshrc
│   └── starship.toml        # Prompt configuration
├── workspace/
│   ├── SOUL.md              # Agent personality
│   ├── USER.md              # About the human
│   ├── AGENTS.md            # Workspace conventions
│   ├── TOOLS.md             # Local tool notes
│   ├── IDENTITY.md          # Agent identity
│   ├── HEARTBEAT.md         # Periodic task checklist
│   ├── MEMORY.md            # Long-term memory seed
│   └── skills/              # Custom OpenClaw skills
├── ansible/
│   ├── group_vars/
│   │   └── all.yml          # Variable overrides (deep-merged with base)
│   ├── playbooks/           # Custom playbooks (run after base)
│   └── roles/               # Custom roles (available to your playbooks)
├── scripts/                 # Shell scripts (run in alphabetical order)
└── credentials/
    └── README.md            # Setup instructions (no actual secrets)
```

## attache.yml Reference

```yaml
# Agent identity
agent_name: Evie

# Feature toggles (all default to false unless noted)
features:
  oh_my_zsh: true           # Install Oh My Zsh + plugins
  starship: true            # Install Starship prompt
  claude_code: true         # Install Claude Code CLI
  docker: false             # Install Docker Desktop
  tailscale: true           # Install Tailscale
  onepassword_cli: true     # Install 1Password CLI
  postgresql: false         # Install PostgreSQL via Homebrew
  supabase: false           # Install Supabase CLI

# Extra Homebrew formulae (appended to base)
homebrew_extra:
  - ffmpeg
  - sox
  - imagemagick
  - ripgrep
  - pandoc-crossref

# Extra Homebrew casks (appended to base)
homebrew_casks_extra:
  - 1password

# Extra mise tools (merged with base, your versions win)
mise_extra:
  python: "3.13.3"
  rust: "1.82.0"

# Git identity for the agent
git:
  user_name: "Evie (Attaché)"
  user_email: "evie@spantree.net"
```

## Workspace Files

Everything in `workspace/` gets copied to `~/.openclaw/workspace/` on the target. This is where your agent's personality, memory, and skills live.

**At minimum, you'll want:**

- **SOUL.md** — who the agent is (personality, voice, boundaries)
- **USER.md** — who the human is (name, preferences, context)

**Optional but recommended:**

- **AGENTS.md** — workspace conventions and behavioral rules
- **TOOLS.md** — notes about local tool configurations
- **IDENTITY.md** — agent name, avatar, emoji
- **skills/** — custom OpenClaw skills unique to this agent

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
