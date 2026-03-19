---
title: Shared Access Patterns
sidebar_position: 3
---

# Team and shared agent patterns

Attaché is designed as a personal agent — one operator, one gateway, full tool access. But teams want their colleagues to interact with the agent too. This is where things get tricky, because OpenClaw's trust model wasn't built for multi-user access.

## The constraint you can't configure around

OpenClaw is explicit about this in their docs:

> If multiple people can message one tool-enabled agent, they all share the same delegated tool authority.

There's no per-sender permission model. No way to say "Alice can search the web but Bob can also run shell commands." If your agent has exec access and ten people can message it, all ten of them can trigger exec. That includes anything they paste into the channel — which is exactly how prompt injection works.

This isn't a bug. OpenClaw was designed for single-operator use. Shared access is something you bolt on, and you have to do it carefully.

## The split model: personal + team agents

The safest pattern is to run two separate agent configurations:

### Your personal agent

This is your copilot. It has everything — full exec, credential access, memory, browser, the works. It operates in DMs or private channels where you're the only one talking to it.

### A team-facing agent

This is the agent your colleagues interact with. It's deliberately limited:

- No exec access (or a very tight allowlist)
- No access to your credential vaults
- No access to your personal memory files (MEMORY.md, SOUL.md, daily notes)
- Read-only access to specific project resources, if needed

```json title="Team agent tool restrictions"
{
  "agents": {
    "team": {
      "tools": {
        "deny": [
          "exec",
          "browser",
          "sessions_spawn",
          "tts",
          "nodes"
        ]
      }
    }
  }
}
```

Both agents can run on the same gateway. They just have different configurations and different channel bindings.

A team agent without exec can still be genuinely useful: answering questions, searching the web, summarizing documents, explaining code from repos (read-only), drafting content, and managing tasks in project tools with scoped API tokens.

## Memory isolation

Your personal agent's memory files contain private context — conversations, decisions, calendar details, credential references, relationship notes. If the team agent shares the same workspace, anyone in a shared channel can ask it to read those files.

Give the team agent its own workspace directory. Don't symlink or share memory files. If both agents need access to a project repo, use separate clones or read-only mounts.

OWASP's agentic security list (ASI06 — Memory and Context Poisoning) also raises a related concern: if an attacker can write to an agent's memory, they can influence its behavior in future sessions. Since OpenClaw agents can write to their own memory files, a prompt injection today could plant instructions that activate tomorrow. Segmenting memory between agents limits the blast radius of this kind of attack.

## Channel configuration for shared use

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

Without `requireMention`, the agent ingests every message in the channel as potential context. That's a wide surface for indirect injection — someone pastes a "code snippet" that contains hidden instructions, and the agent acts on it without anyone explicitly asking. With mentions required, the agent only processes messages directed at it.

### Use sender allowlists

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

It's worth looking at how competitors approach the same problem:

**Devin (Cognition)** runs entirely in a cloud-based sandbox. The agent never touches your local machine. Credentials are kept outside the sandbox and accessed through a proxy. This is the strongest isolation model in the industry right now — but it only works because Devin is a cloud product, not a local agent.

**Claude Code** recently introduced [OS-level sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing) using bubblewrap (Linux) and seatbelt (macOS). Filesystem and network access are restricted at the kernel level. The agent works freely within its sandbox but can't reach outside it. They open-sourced the runtime.

**Cline** takes the opposite approach: every action requires explicit human approval through a GUI. No sandboxing — the human is the sandbox. This works for interactive coding sessions but doesn't scale to autonomous operation.

OpenClaw sits somewhere in the middle. It has application-layer controls (exec allowlists, tool deny lists, channel policies) but no OS-level sandboxing. For single-operator use, that's workable. For shared access, you need to be more deliberate about boundaries.

## Secrets approval via DM

For operations where you want human oversight — especially credential access — you can build a lightweight approval flow using your existing messaging channels.

### The pattern

Instead of letting the agent call `op read` directly, wrap it in a script that:

1. Logs what secret is being requested and by which agent session
2. Sends you a DM asking for approval (Discord, Slack, or Telegram)
3. Waits for your explicit yes/no
4. Only executes the `op read` after approval

```
Agent needs ANTHROPIC_API_KEY for summary generation
  -> Proxy sends Discord DM: "Evie wants ANTHROPIC_API_KEY
     to generate a weekly report summary. Approve?"
  -> You tap Approve
  -> Proxy runs op read, returns the value
```

### Why DM and not a channel message

The approval request goes to a private DM, not a shared channel. Only you see which secrets are being accessed. Nobody else can spoof the approval, and you can respond from your phone without being at the workstation.

### Implementation options

**Discord interactive buttons** — Send a message with Approve/Deny buttons. You tap from your phone. The agent waits for the callback.

**Slack Block Kit actions** — Same pattern, native Slack buttons.

**Telegram inline keyboards** — Lightweight approval buttons in a DM.

**Polling fallback** — If interactive components aren't available, post a message and poll for a text reply.

:::info Mobile push is coming
OpenClaw's node system supports push notifications to companion devices. When the iOS app is publicly available, this will enable native mobile approval flows — tap a notification to approve, similar to how Google prompts you to verify a login on your phone. The DM approach works today and transitions cleanly to push notifications later.
:::

### When approval is worth the friction

Not every credential access needs a human in the loop. Reserve it for:

- **First use in a session** — approve once, cache the result
- **High-value credentials** — production databases, payment APIs, signing keys
- **Unusual patterns** — a credential the agent doesn't normally request
- **External actions** — sending emails, creating releases, pushing to production

Routine, low-risk operations (fetching a search API key, reading a TTS voice ID) can use direct access without approval.

## Things to avoid

- **Putting your personal agent in an open Slack channel.** Everyone in the channel gets your full tool permissions.
- **Using `groupPolicy: "open"` on any agent with exec access.** There's no access control at all.
- **Sharing 1Password vault access between personal and team agents.** Use separate vaults with separate service accounts.
- **Letting the team agent read your memory files.** Workspace isolation isn't optional for shared setups.
- **Assuming `requireMention` stops all injection.** It narrows the surface but doesn't close it. Someone can still inject content in an @-mention.
