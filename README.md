# Attaché

**Turnkey AI agent platform powered by [OpenClaw](https://openclaw.ai).**

Attaché provisions a bare macOS machine into a fully configured AI agent host with a single Ansible command. No tribal knowledge required.

## Quick Start

```bash
# 1. Clone this repo
git clone https://github.com/Spantree/attache.git
cd attache

# 2. Copy and edit the inventory
cp ansible/inventory/hosts.example.yml ansible/inventory/hosts.yml
# Edit hosts.yml with your target machine's details

# 3. Copy your SSH key to the target
ssh-copy-id <agent-user>@<target-host>

# 4. Run the bootstrap
cd ansible
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml
```

## Documentation

Full docs at [attache.dev](https://attache.dev) (coming soon).

To run docs locally:

```bash
bun install
bun run dev:docs
```

## Project Structure

```
├── ansible/              # Ansible playbooks and roles
│   ├── playbooks/        # Main playbooks
│   ├── roles/            # Role definitions (homebrew, node, openclaw, etc.)
│   ├── inventory/        # Host inventories
│   └── group_vars/       # Default variables
├── docs/                 # Docusaurus documentation site
└── trellis.config.ts     # Trellis site configuration
```

## License

MIT
