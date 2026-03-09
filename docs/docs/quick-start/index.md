---
sidebar_position: 2
---

# Quick Start

This guide walks you through setting up an Attaché agent from scratch. By the end, you'll have a fully configured Mac running an OpenClaw-powered AI agent.

## Prerequisites

You'll need two machines: a target Mac where the agent will live, and a control machine (your laptop) where you'll run the provisioning.

### Target Mac

**Start with macOS Tahoe (15.x),** either a clean install or a minimal one. Attaché's Ansible playbooks assume a fresh-ish system — they won't conflict with existing software, but a clean slate is the simplest path.

**Create a single admin user account** that the agent will operate under. Name it something that reflects the agent's identity — `evie`, `jarvis`, `friday`, whatever you like. This user owns the workspace, runs the OpenClaw gateway, and is the SSH target for all management.

**Enable Remote Login** so Ansible can SSH in. Open System Settings, navigate to General → Sharing, and toggle Remote Login on. Take note of the machine's IP address or hostname while you're there.

**Connect the machine to the network.** It needs internet access for Homebrew, npm, and Docker image pulls during bootstrap, and it needs to be reachable from your control machine over SSH.

### Control Machine

**Install uv,** the Python package manager that Attaché uses to manage its dependencies. On macOS, `brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh` both work. uv is the only tool you need on the control side — it handles Ansible and everything else.

**Set up SSH access to the target.** Key-based authentication is strongly recommended — the bootstrap will disable password auth on the target as part of SSH hardening, so if you're relying on password login, you'll lock yourself out.

**Clone this repository** so you have access to the Ansible playbooks and the `attache` CLI.

## Step 1: Prepare the Target Mac

Start with the fresh macOS install and the admin user account created per the prerequisites above.

Enable Remote Login if you haven't already. Open **System Settings**, navigate to **General → Sharing**, toggle **Remote Login** on, and note the machine's IP address or hostname.

## Step 2: Copy Your SSH Key

From your control machine, copy your SSH public key to the target:

```bash
ssh-copy-id <agent-user>@<target-host>
```

Verify you can connect without a password:

```bash
ssh <agent-user>@<target-host> echo "Connected"
```

## Step 3: Configure the Inventory

Copy the example inventory and edit it with your target machine's details:

```bash
cp ansible/inventory/hosts.example.yml ansible/inventory/hosts.yml
```

```yaml
all:
  hosts:
    my-agent:
      ansible_host: 192.168.1.100  # or hostname
      ansible_user: evie            # the agent's admin user
      agent_name: Evie              # display name for the agent
```

## Step 4: Run the Bootstrap

The `attache` CLI wraps the Ansible playbooks, handles Galaxy dependency installation, and generates the inventory for you. Without a config repo, it installs the core platform. With one, it layers your personalization on top.

### Base only

```bash
uv run attache bootstrap evie@mac-mini.local
```

This installs Homebrew, Node.js, Docker (via Colima), OpenClaw, Supabase, Tailscale, and applies SSH hardening. The workspace is scaffolded at `~/.openclaw/workspaces/main/` with `memory/` and `knowledge/` directories.

### With a config repo

```bash
uv run attache bootstrap evie@mac-mini.local --config divideby0/evie
```

This runs the base bootstrap first, then clones your config repo and applies it on top — extra packages, workspace files, skills, shell overlays, custom Ansible playbooks, and any Docker services your skills need. See [Architecture](../architecture/) for the full merge behavior.

**For private config repos,** the agent's SSH key needs to be authorized on GitHub:

```bash
uv run attache bootstrap evie@mac-mini.local --config divideby0/evie --private
```

### Installing globally

If you prefer a persistent `attache` command instead of `uv run`:

```bash
uv tool install attache-platform
attache bootstrap evie@mac-mini.local --config divideby0/evie
```

## Step 5: Connect Your Agent

Once the bootstrap completes, SSH into the target and pair the agent with your OpenClaw account:

```bash
ssh <agent-user>@<target-host>
openclaw pair
```

Follow the pairing prompts to connect your agent to your messaging surfaces — Discord, Slack, Telegram, whatever you use.

## What's Next?

**[Architecture](../architecture/)** explains the two-layer design and how the base platform and config repo work together.

**[Config Repo Guide](../config-repo/)** walks you through setting up your own config repo with workspace files, skills, and custom Ansible playbooks.

**[Memory System](../memory/)** covers the four-layer data architecture that gives your agent continuity across sessions.
