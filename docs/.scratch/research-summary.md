# Security Research Summary

## OWASP Top 10 for Agentic Applications (2026)
Source: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
Full breakdown: https://www.aikido.dev/blog/owasp-top-10-agentic-applications

1. **ASI01 – Agent Goal Hijack** — Indirect prompt injection alters agent objectives via poisoned content
2. **ASI02 – Tool Misuse and Exploitation** — Agent uses legitimate tools unsafely (over-privileged tools, unvalidated commands)
3. **ASI03 – Identity and Privilege Abuse** — Agents inherit/cache credentials, escalate across sessions
4. **ASI04 – Agentic Supply Chain** — Malicious plugins, MCP servers, prompt templates
5. **ASI05 – Unexpected Code Execution** — Agents generate and run code unsafely
6. **ASI06 – Memory and Context Poisoning** — RAG poisoning, cross-tenant context leakage
7. **ASI07 – Insecure Inter-Agent Communication** — Unauthed/unencrypted agent-to-agent messaging
8. **ASI08 – Cascading Failures** — Small errors compound across multi-agent systems
9. **ASI09 – Human-Agent Trust Exploitation** — Users over-trust agent recommendations
10. **ASI10 – Insufficient Monitoring** (implied from docs)

Key principle: **Least Agency** — only grant agents the minimum autonomy for safe, bounded tasks.

## MITRE ATLAS (Oct 2025 update)
- 15 tactics, 66 techniques, 46 sub-techniques
- Oct 2025 update added 14 agent-focused techniques (collab with Zenity Labs)
- Covers reconnaissance → resource development → initial access → execution → persistence → exfiltration
- Source: https://atlas.mitre.org/

## Competing Agent Security Models

### Devin (Cognition)
- **Cloud-based sandboxed compute** — agent runs in isolated cloud VM, not on user's machine
- Shell, code editor, browser all within sandbox
- Client provides secure connection between local dev environment and isolated sandbox
- Credentials never inside sandbox — uses proxy service for git auth
- SSO via Okta for enterprise

### Claude Code (Anthropic)
- **Permission-based model**: read-only by default, asks approval for modifications
- Auto-allows safe commands (echo, cat); most operations need explicit approval
- **New sandboxing** (open source): bubblewrap (Linux) / seatbelt (macOS) for OS-level isolation
  - Filesystem isolation: read/write only to CWD, blocks modification outside
  - Network isolation: traffic through proxy that enforces domain allowlist
  - Reduced permission prompts by 84% internally
- **--dangerously-skip-permissions**: autonomous mode, deliberately scary name
- Claude Code on the web: isolated cloud sandbox, git credentials NEVER inside sandbox
- Open-sourced sandbox runtime: https://github.com/anthropic-experimental/sandbox-runtime

### Cline (VS Code)
- **Human-in-the-loop GUI**: approves every file change and terminal command
- Shows diffs before writing files
- Terminal commands proposed and shown for explicit approval
- Plan-act-verify loops with human sign-off at each step
- No sandbox — relies entirely on human approval

### Goose (Block/Square)
- Open source, extensible agent framework
- MCP-based tool integration
- Runs locally on user's machine
- Uses .goosehints for project-specific rules
- Less documented security model than others

## Auth0's Five-Step OpenClaw Security Guide
Source: https://auth0.com/blog/five-step-guide-securing-moltbot-ai-agent/

1. **Enable sandbox** — VM/container/devbox, single project dir, no ~/.ssh or password manager
2. **Enable allowlists** — commands, filesystem paths, integrations, network
3. **Use prompt injection-resistant models** + scoped/short-lived credentials
4. **Run audits, keep logs** — tool execution logs, kill switch, periodic permission reset
5. **Don't add personal bots to group chats** — separate "work bot" with limited credentials

Key quote: "Stop treating agents like chat toys and start treating them like junior employees with root access."

## Key Additional Best Practices Not Yet in Our Docs

1. **Filesystem isolation / sandboxing** — We don't document OS-level sandboxing (bubblewrap/seatbelt). Claude Code's approach is worth referencing.
2. **Network isolation / domain allowlisting** — We cover loopback binding for the gateway but not restricting the agent's outbound network access (preventing exfil via curl to arbitrary domains).
3. **Short-lived/scoped credentials** — Auth0 emphasizes ephemeral credentials. We cover 1Password scoping but not the "assume anything the agent sees might leak" principle.
4. **Separate agent identities** — OWASP ASI03 recommends isolated identities per agent, not inheriting the operator's full identity.
5. **Kill switch** — Auth0 recommends a "big red button" to disable all integrations quickly. We don't have this documented.
6. **Memory poisoning defense** — OWASP ASI06 covers RAG/memory poisoning. Our memory files are writable by the agent — a compromised agent could poison its own memory for future sessions.
7. **Circuit breakers for cascading failures** — OWASP ASI08. Not relevant for single-agent but matters for multi-agent Attaché deployments.
8. **Git credential proxy** — Claude Code's approach of keeping git credentials OUTSIDE the sandbox and using a scoped proxy is elegant. Worth documenting as a pattern.
