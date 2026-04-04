---
title: Multiplayer
sidebar_position: 3
---

# Multiplayer

Evie Platform is designed as a personal agent — one operator, one gateway, full tool access. But real work is collaborative. Team members need to interact with agents. Agents need to coordinate with other agents. Evie Platform's multiplayer patterns make this safe by default.

## The constraint Evie Platform works around

OpenClaw is explicit about this in their docs:

> If multiple people can message one tool-enabled agent, they all share the same delegated tool authority.

There's no per-sender permission model. No way to say "Alice can search the web but Bob can also run shell commands." If your agent has exec access and ten people can message it, all ten can trigger exec. That includes anything they paste into the channel — which is exactly how prompt injection works.

OpenClaw was designed for single-operator use. Evie Platform makes multiplayer safe through agent splitting, memory isolation, and approval flows.

## The split model: personal + team agents

Evie Platform's recommended pattern is two separate agent configurations on the same gateway.

### Your personal agent

Your copilot. Full exec, credential access, memory, browser — everything. It operates in DMs or private channels where you're the only one talking to it.

### The team-facing agent

The agent your colleagues interact with. Evie Platform configures it with deliberate limits:

- No exec access (or a very tight allowlist)
- No access to your credential vaults
- No access to your personal memory files (MEMORY.md, SOUL.md, daily notes)
- Read-only access to specific project resources, if needed

```json title="Team agent tool restrictions"
{
  "agents": {
    "team": {
      "tools": {
        "deny": ["exec", "browser", "sessions_spawn", "tts", "nodes"]
      }
    }
  }
}
```

Both agents run on the same gateway with different configurations and different channel bindings.

A team agent without exec is still genuinely useful: answering questions, searching the web, summarizing documents, explaining code from repos (read-only), drafting content, and managing tasks in project tools with scoped API tokens.

## Agent-to-agent coordination

When agents need to coordinate — your personal agent delegating research to a team agent, or multiple team agents working on different aspects of a project — Evie Platform enforces the same boundaries:

- Each agent operates within its own tool permissions. A team agent can't escalate to your personal agent's exec access.
- Inter-agent messages are treated as untrusted input by the receiving agent, just like messages from external senders.
- Credential access follows the [secrets proxy daemon](./hardening.md#secrets-proxy-daemon) allowlist. The team agent can request secrets it's authorized for; everything else is denied or requires your approval.

The coordination pattern is message-based, not shared-context. Agents exchange results, not capabilities.

## Memory isolation

Your personal agent's memory files contain private context — conversations, decisions, calendar details, credential references, relationship notes. If the team agent shares the same workspace, anyone in a shared channel can ask it to read those files.

Evie Platform addresses this:

- **Separate workspace directories** for personal and team agents. No symlinks, no shared memory files.
- **Separate clones or read-only mounts** for shared project repos.
- **No cross-agent memory access** by default.

OWASP's agentic security list (ASI06 — Memory and Context Poisoning) raises a related concern: if an attacker can write to an agent's memory, they can influence its behavior in future sessions. Since OpenClaw agents write to their own memory files, a prompt injection today could plant instructions that activate tomorrow. Segmenting memory between agents limits the blast radius.

## Channel configuration for multiplayer

### Always require mentions

```json
{
  "channels": {
    "slack": {
      "accounts": {
        "team-bot": {
          "channels": {
            "C0SHARED": {
              "requireMention": true
            }
          }
        }
      }
    }
  }
}
```

Without `requireMention`, the agent ingests every message in the channel as potential context. Someone pastes a "code snippet" with hidden instructions, and the agent acts on it without being asked. With mentions required, the agent only processes messages directed at it.

### Sender allowlists

```json
{
  "channels": {
    "slack": {
      "groupPolicy": "allowlist"
    }
  }
}
```

Even with a locked-down team agent, control who can interact with it. Open group policies mean anyone who joins the channel gets access. Allowlists mean you decide who's in.

## How other agent platforms handle this

**Devin (Cognition)** runs entirely in a cloud-based sandbox. The agent never touches your local machine. Credentials are kept outside the sandbox and accessed through a proxy. Strongest isolation model in the industry — but only works because Devin is a cloud product.

**Claude Code** recently introduced [OS-level sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing) using bubblewrap (Linux) and seatbelt (macOS). Filesystem and network access restricted at the kernel level. Open-sourced the runtime.

**Cline** requires explicit human approval for every action through a GUI. No sandboxing — the human is the sandbox. Works for interactive sessions but doesn't scale to autonomous operation.

OpenClaw sits in the middle: application-layer controls (exec allowlists, tool deny lists, channel policies) but no OS-level sandboxing. Evie Platform's multiplayer patterns layer safety on top of what OpenClaw provides.

## Secrets approval via DM

For operations where you want human oversight — especially credential access — Evie Platform supports a lightweight approval flow through your existing messaging channels.

### The pattern

Instead of letting the agent call `op read` directly, the [secrets proxy daemon](./hardening.md#secrets-proxy-daemon) handles access control:

1. Logs what secret is being requested and by which agent session
2. Checks the per-secret allowlist
3. For sensitive secrets, sends you a DM asking for approval (Discord, Slack, or Telegram)
4. Waits for your explicit yes/no
5. Only returns the secret value after approval

```
Agent needs ANTHROPIC_API_KEY for summary generation
  → Proxy checks allowlist: ✓ (routine, auto-approved)
  → Returns value

Agent needs PRODUCTION_DB_PASSWORD for migration
  → Proxy sends Discord DM: "Agent needs PRODUCTION_DB_PASSWORD
     for database migration. Approve?"
  → You tap Approve
  → Proxy returns value
```

### Why DM and not a channel message

The approval request goes to a private DM, not a shared channel. Only you see which secrets are being accessed. Nobody else can spoof the approval, and you can respond from your phone without being at the workstation.

### Implementation options

**Discord interactive buttons** — Send a message with Approve/Deny buttons. Tap from your phone. The agent waits for the callback.

**Slack Block Kit actions** — Same pattern, native Slack buttons.

**Telegram inline keyboards** — Lightweight approval buttons in a DM.

**Polling fallback** — If interactive components aren't available, post a message and poll for a text reply.

:::info Mobile push is coming
OpenClaw's node system supports push notifications to companion devices. When the iOS app is publicly available, this will enable native mobile approval flows — tap a notification to approve. The DM approach works today and transitions cleanly to push notifications later.
:::

### When approval is worth the friction

Not every credential access needs a human in the loop. Reserve DM approval for:

- **First use in a session** — approve once, cache the result
- **High-value credentials** — production databases, payment APIs, signing keys
- **Unusual patterns** — a credential the agent doesn't normally request
- **External actions** — sending emails, creating releases, pushing to production

Routine, low-risk operations (fetching a search API key, reading a TTS voice ID) can use direct access without approval.

## Things to avoid

- **Putting your personal agent in an open Slack channel.** Everyone in the channel gets your full tool permissions.
- **Using `groupPolicy: "open"` on any agent with exec access.** There's no access control at all.
- **Sharing 1Password vault access between personal and team agents.** Use separate vaults with separate service accounts.
- **Letting the team agent read your memory files.** Workspace isolation isn't optional for multiplayer setups.
- **Assuming `requireMention` stops all injection.** It narrows the surface but doesn't close it. Someone can still inject content in an @-mention.
- **Letting agents share context instead of results.** Inter-agent communication should exchange outputs, not tool access or memory.
