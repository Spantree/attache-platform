---
sidebar_position: 2
---

# Quick Start

This guide walks you through setting up an Attaché agent from scratch. By the end, you'll have a fully configured Mac running an OpenClaw-powered AI agent.

## Prerequisites

**On the target Mac (the agent's machine):**

- macOS Tahoe (15.x) — clean or minimal install
- A single admin user account for the agent (e.g., `evie`, `jarvis`, `friday`)
- SSH enabled (System Settings → General → Sharing → Remote Login)
- Connected to the network

**On your control machine (your laptop):**

- Ansible installed (`brew install ansible` or `pip install ansible`)
- SSH access to the target Mac (key-based recommended)
- This repository cloned

## Step 1: Prepare the Target Mac

Start with a fresh or minimal macOS Tahoe install. Create a single admin user — this will be the agent's user account.

Enable Remote Login:
1. Open **System Settings**
2. Navigate to **General → Sharing**
3. Toggle **Remote Login** on
4. Note the machine's IP address or hostname

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

Copy the example inventory and edit it:

```bash
cp ansible/inventory/hosts.example.yml ansible/inventory/hosts.yml
```

Edit `hosts.yml` with your target machine's details:

```yaml
all:
  hosts:
    my-agent:
      ansible_host: 192.168.1.100  # or hostname
      ansible_user: evie            # the agent's admin user
      agent_name: Evie              # display name for the agent
```

## Step 4: Run the Bootstrap

### Base only (no config repo)

```bash
cd ansible
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml
```

This installs the core platform: Homebrew, Node.js, OpenClaw, SSH hardening, workspace scaffolding.

### With a config repo

```bash
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml \
  -e config_repo=divideby0/evie
```

This runs the base bootstrap, then clones and applies your config repo on top. See [Architecture](../architecture/index.md) for the full merge behavior.

For private config repos, ensure the agent's SSH key is authorized on GitHub, or pass a token:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml \
  -e config_repo=divideby0/evie \
  -e config_repo_private=true
```

## Step 5: Connect Your Agent

Once the bootstrap completes, SSH into the target and pair your agent:

```bash
ssh <agent-user>@<target-host>
openclaw pair
```

Follow the pairing prompts to connect your agent to your OpenClaw account and messaging surfaces.

## What's Next?

- [Architecture](../architecture/index.md) — understand the two-layer design
- [Config Repo Guide](../config-repo/index.md) — set up your own config repo
- [Specifications](../specifications/index.md) — detailed specs for each component
