---
sidebar_position: 3
---

# Architecture

Attaché uses a two-layer architecture: a **base platform** that every agent shares, and an optional **user config repo** that customizes the agent for a specific person or team.

## Two-Layer Design

```
┌─────────────────────────────────────────────┐
│           User Config Repo                  │
│  (github.com/username/agent-name)           │
│                                             │
│  attache.yml, Brewfile, workspace/,         │
│  ansible/playbooks/, ansible/roles/,        │
│  ansible/group_vars/, shell/, scripts/      │
├─────────────────────────────────────────────┤
│           Attaché Base Platform             │
│  (github.com/Spantree/attache-platform)     │
│                                             │
│  Core Ansible roles: homebrew, mise, node,  │
│  openclaw, ssh, shell, workspace, git       │
└─────────────────────────────────────────────┘
         ▼            ▼            ▼
    macOS Tahoe   OpenClaw    Agent Workspace
```

### Layer 1: Base Platform

The base platform is opinionated and turnkey. It installs everything needed to run an OpenClaw agent on a bare macOS Tahoe machine:

- **Xcode CLI tools** and Rosetta (Apple Silicon)
- **Homebrew** and core CLI packages
- **mise** for version management
- **Node.js** and **Bun** via mise
- **OpenClaw** installed globally, gateway running as a launch agent
- **SSH hardening** (key-only auth, no root login)
- **Git** with sensible defaults
- **Workspace scaffolding** (`~/.openclaw/workspaces/main/` with `memory/`, `knowledge/`, and `skills/`)
- **Tailscale** installed and ready for secure tunnel access

Every Attaché agent runs the same base. It's idempotent — run it again anytime to converge.

### Layer 2: User Config Repo

The user config repo is where personalization lives. It can be:

- **Public** — `github.com/username/attache-config` for shared configurations
- **Private** — `github.com/username/agent-name` for a specific agent (e.g., `divideby0/evie`)

The config repo uses a known directory structure that Attaché discovers and applies automatically.

## Config Repo Structure

```
my-agent/
├── attache.yml              # Feature flags and variable overrides
├── Brewfile                 # Additional Homebrew packages (merged with base)
├── mise/
│   └── config.toml          # Additional mise tools (merged with base)
├── shell/
│   ├── zshrc.local          # Agent-specific aliases, PATH, env vars
│   └── starship.toml        # Custom prompt configuration
├── workspace/
│   ├── SOUL.md              # Agent personality and voice
│   ├── USER.md              # About the human
│   ├── AGENTS.md            # Workspace conventions
│   ├── TOOLS.md             # Local tool notes
│   ├── IDENTITY.md          # Agent identity metadata
│   └── skills/              # Custom OpenClaw skills
├── ansible/
│   ├── group_vars/          # Merged with base group_vars (user wins)
│   │   └── all.yml
│   ├── playbooks/           # Run after base bootstrap completes
│   │   ├── integrations.yml # Messaging surface setup, bot tokens
│   │   └── credentials.yml  # 1Password → credential file extraction
│   └── roles/               # Custom roles for user playbooks
│       ├── supabase-local/
│       ├── slack-bot/
│       └── discord-bot/
├── scripts/                 # Shell scripts run in alphabetical order
│   ├── 01-1password.sh
│   ├── 02-tailscale.sh
│   └── 03-github-auth.sh
└── credentials/
    └── README.md            # Instructions (actual creds via 1Password/vault)
```

### attache.yml

The main configuration file. Controls feature flags and overrides base defaults:

```yaml
agent_name: Evie

features:
  oh_my_zsh: true
  starship: true
  claude_code: true
  docker: false
  tailscale: true
  onepassword_cli: true
  postgresql: false

homebrew_extra:
  - ffmpeg
  - sox
  - imagemagick
  - pandoc-crossref

homebrew_casks_extra:
  - 1password

git:
  user_name: "Evie (Attaché)"
  user_email: "evie@spantree.net"
```

### Merge Behavior

| Item | Behavior |
|---|---|
| `group_vars/all.yml` | Deep-merged with base. User values win on conflict. |
| `Brewfile` | Appended to base packages. No deduplication needed (Homebrew handles it). |
| `mise/config.toml` | Merged with base tools. User versions override base versions. |
| `workspace/` | Copied into `~/.openclaw/workspaces/main/`. Existing files are overwritten. |
| `shell/` | Installed as overlays (e.g., `zshrc.local` sourced from `.zshrc`). |
| `ansible/playbooks/` | Run after base bootstrap. Entirely user-controlled. |
| `ansible/roles/` | Available to user playbooks only. Not mixed into base. |
| `scripts/` | Run in alphabetical order after everything else. |

## Bootstrap Sequence

```
1. Pre-flight checks (macOS version, Xcode CLI, Rosetta)
2. Clone attache-platform (base)
3. Run base bootstrap.yml with default group_vars
4. If config repo specified:
   a. Clone config repo → ~/.attache/config
   b. Merge group_vars (user overrides base)
   c. Re-run base bootstrap with merged vars (idempotent)
   d. Install extra Homebrew packages from Brewfile
   e. Install extra mise tools from mise/config.toml
   f. Copy workspace/ → ~/.openclaw/workspaces/main/
   g. Install shell overlays (zshrc.local, starship.toml)
   h. Run ansible/playbooks/* in order
   i. Run scripts/* in alphabetical order
5. Start OpenClaw gateway
6. Print next steps (openclaw pair)
```

## Security Model

**SSH:** Key-only authentication, no root login, no password auth.

**Credentials:** Never stored in the config repo. Use 1Password CLI, environment variables, or vault services. The `credentials/` directory in the config repo is for instructions and templates only.

**Config repos:** Can be public (shared team configs) or private (agent-specific with workspace files). Private repos require the agent's SSH key or a GitHub token to clone.

## Networking

**Secure tunneling is required.** Attaché agents need secure remote access for management, and services like Supabase Studio should never be exposed on the open network.

**Tailscale** is the default and first supported tunnel provider. It's installed as part of the base platform — not optional. After bootstrap, the agent machine must be joined to a tailnet (via auth key or interactive login).

Why Tailscale:
- **Zero-config mesh networking** — agent machines are reachable by Tailscale hostname, no port forwarding or dynamic DNS
- **MagicDNS** — `agent-mac.tailnet-name.ts.net` just works
- **ACLs** — control who can reach the agent machine and which ports are open
- **Tailscale Serve/Funnel** — expose dev servers or services securely without opening firewall ports

Future tunnel providers (Cloudflare Tunnel, WireGuard, etc.) can be added as alternatives, but every Attaché deployment must have at least one.

**Firewall:** macOS application firewall is enabled. SSH is restricted to key-only auth. All other services (Supabase, SonarQube, etc.) are only accessible via the secure tunnel.
