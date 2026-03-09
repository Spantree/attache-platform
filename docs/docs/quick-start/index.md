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

## Step 4: Run the Bootstrap Playbook

```bash
cd ansible
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml
```

This single command will:

1. **Install Homebrew** and essential packages
2. **Install Node.js** via mise (version manager)
3. **Install OpenClaw** globally via npm
4. **Configure the shell** (zsh, PATH, environment variables)
5. **Set up SSH hardening** (key-only auth, no root login)
6. **Create the workspace** directory structure
7. **Install and start the OpenClaw gateway** as a launch agent

## Step 5: Connect Your Agent

Once the bootstrap completes, SSH into the target and pair your agent:

```bash
ssh <agent-user>@<target-host>
openclaw pair
```

Follow the pairing prompts to connect your agent to your OpenClaw account and messaging surfaces.

## What's Next?

- [Architecture Overview](../architecture/index.md) — understand how the pieces fit together
- [Specifications](../specifications/index.md) — detailed specs for each component
