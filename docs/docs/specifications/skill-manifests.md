# Skill Manifests

Skills are the primary extension point for Evie Platform agents. A skill teaches an agent *how* to do something: code review, research, deployment, whatever. Some skills are pure logic (just markdown and scripts). Others need infrastructure like Docker services, API keys, or CLI tools.

![Skills & Extensibility](/img/evie-skills-L1.png)

## The SKILL.md Convention

SKILL.md is native to OpenClaw, originally derived from Claude Code's convention. Each skill is a combination of **progressive-disclosure markdown instructions** and **executable scripts**. The markdown file teaches the agent how to use the skill. The scripts handle the actual work.

This makes whole integrations pluggable and independently extensible. The Slack skill, for example, handles both interacting with Slack and ingesting the Slack feed, making it a self-contained module. Want to add Salesforce? Write a SKILL.md that describes the API, pair it with scripts for data sync, give it credentials via [agent-blind injection](/security/#agent-blind-credential-injection), done.

Evie Platform writes all skills from scratch for security reasons. The ClawHavoc campaign identified over 800 malicious packages on ClawHub, some delivering the Atomic macOS Stealer. Rather than trusting third-party supply chains, the agent creates and updates its own skills as it learns new procedures. Skill modifications are audited by independent agents working off a security ruleset: the agent that does the work is not the same agent that audits it.

The **manifest** (`evie.config.json`) is how a skill declares what it needs to run.

## Anatomy of a Skill

```
skills/
└── code-review/
    ├── SKILL.md                    # OpenClaw skill (agent instructions)
    ├── evie.config.json                # Dependencies and strategies
    ├── docker-compose.yml          # Optional: services this skill needs
    └── scripts/                    # Skill scripts (TypeScript, shell)
        ├── review.ts
        └── sonar-scan.ts
```

### SKILL.md

The OpenClaw skill file. This is what the agent reads to understand how to use the skill. No changes from the standard OpenClaw skill format.

### evie.config.json

Declares the skill's metadata, strategies, and requirements:

```json
{
  "name": "code-review",
  "description": "Holistic code review with multiple analysis strategies",
  "version": "1.0.0",

  "strategies": {
    "native": {
      "description": "Contextual review via OpenClaw (understands project intent and history)"
    },
    "claude-code": {
      "description": "Deep code analysis via Claude Code session dispatch",
      "requires": { "skills": ["claude-code"] }
    },
    "codex": {
      "description": "Code review via OpenAI Codex dispatch",
      "requires": { "skills": ["codex"], "env": ["OPENAI_API_KEY"] }
    },
    "static-analysis": {
      "description": "Static analysis for bugs, code smells, and vulnerabilities",
      "requires": {
        "services": ["sonarqube"],
        "env": ["SONAR_HOST_URL", "SONAR_TOKEN"]
      }
    }
  },

  "default_strategies": ["native", "claude-code", "static-analysis"]
}
```

### docker-compose.yml

Standard Docker Compose file at the skill root. Each skill runs as its own independent compose project:

```yaml
services:
  sonarqube:
    image: sonarqube:community
    container_name: evie-sonarqube
    ports:
      - "9000:9000"
    volumes:
      - sonarqube-data:/opt/sonarqube/data
      - sonarqube-logs:/opt/sonarqube/logs
      - sonarqube-extensions:/opt/sonarqube/extensions
    environment:
      - SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true
    restart: unless-stopped

volumes:
  sonarqube-data:
  sonarqube-logs:
  sonarqube-extensions:
```

## How Evie Platform Uses Manifests

### During Bootstrap

1. Scan all skills in the workspace for `evie.config.json` files
2. For each skill with a `docker-compose.yml`, run `docker compose up -d` in that skill's directory
3. Validate that declared `requires.env` variables are set (warn if missing)
4. Validate that declared `requires.tools` are installed (warn if missing)

### At Runtime

When the agent invokes a skill, it can check which strategies are available:

1. Read the manifest
2. For each strategy, check if requirements are satisfied (services running, env vars set, tools installed)
3. Run the default strategies that are available
4. Report which strategies were skipped and why

This means a skill degrades gracefully. If SonarQube isn't running, the code review skill still works — it just skips the static analysis strategy and uses native + Claude Code.

## evie.config.json Reference (Skill)

```json
{
  "name": "string",
  "description": "string",
  "version": "string",

  "strategies": {
    "<strategy-name>": {
      "description": "string",
      "requires": {
        "services": ["string"],
        "skills": ["string"],
        "tools": ["string"],
        "env": ["string"]
      }
    }
  },

  "default_strategies": ["string"],

  "author": "string",
  "license": "string",
  "homepage": "string"
}
```

Note: This is the skill-level `evie.config.json`. The same filename is used at the config repo root for agent configuration — the schema is determined by context.

## Coding Agent Skills

Coding agents (Claude Code, Codex, Gemini CLI, Aider) are a special category of skill. Each coding agent gets its own skill directory with a dispatch harness, configuration, and manifest.

### Configuration in evie.config.json

In the agent's root `evie.config.json`:

```json
{
  "coding_agents": {
    "claude_code": {
      "max_sessions": 4,
      "default_model": "claude-sonnet-4-20250514",
      "permissions": "--dangerously-skip-permissions"
    },
    "codex": true
  }
}
```

`true` is shorthand for "install with default settings." A map provides custom configuration that's passed to the skill.

### Skill Structure

```
skills/
├── claude-code/
│   ├── SKILL.md             # How the agent dispatches CC sessions
│   ├── evie.config.json         # coding_agent: true, requires: [claude]
│   └── scripts/
│       └── dispatch.ts      # tmux lifecycle, brief gen, monitoring
├── codex/
│   ├── SKILL.md             # How the agent uses Codex for reviews
│   ├── evie.config.json         # coding_agent: true, requires: [codex]
│   └── scripts/
│       └── review.ts
```

### Supported Coding Agents

| Agent           | Status                 | Use case                                                                                                                          |
| --------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **claude-code** | ✅ Supported           | Full dispatch harness — tmux session management, brief generation, context assembly, worktree isolation, completion notifications |
| **codex**       | ✅ Supported (limited) | Alternate code reviewer — dispatched for review tasks, no full session harness yet                                                |
| **gemini-cli**  | 🔜 Planned             | TBD                                                                                                                               |
| **aider**       | 🔜 Planned             | TBD                                                                                                                               |

The `claude-code` skill is the reference implementation. It's a port of the `cc-dispatch` pattern: assemble context, generate a brief, launch a tmux session, monitor for completion, notify the orchestrating agent. Other coding agent skills can follow the same pattern as they mature.

## Skill Categories

Skills fall into a few natural categories:

| Category         | Examples                                     | Typically needs services?   |
| ---------------- | -------------------------------------------- | --------------------------- |
| **Analysis**     | code-review, security-scan, dependency-audit | Often (SonarQube, Snyk)     |
| **Integration**  | slack, discord, google, github               | No (API keys only)          |
| **Knowledge**    | research, knowledge-base, RAG                | Sometimes (vector DB)       |
| **Operations**   | deployment, monitoring, alerting             | Often (Grafana, Prometheus) |
| **Productivity** | calendar, email, task management             | No                          |
| **Development**  | testing, linting, formatting                 | Rarely                      |

## Relationship to ClawHub

[ClawHub](https://clawhub.com) is the community marketplace for OpenClaw skills. Skills published there can include manifests, and when installed via `clawhub install`, Evie Platform reads the manifest and provisions any required services automatically. Skills without manifests work fine: they're treated as pure logic skills with no infrastructure requirements.

Evie Platform's policy is to use ClawHub as **inspiration, not a dependency**. Browse the marketplace for patterns and approaches, but write your own implementation. This avoids supply-chain risk entirely. The ClawHavoc campaign demonstrated why this matters: over 800 malicious packages were identified in a single sweep, and the attack surface grows with every third-party dependency you trust.

## MCP Bridge

Evie Platform supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) through `mcporter`, which connects to any MCP-compatible tool server. This hedges against ecosystem lock-in: if a tool publishes an MCP server, the agent can use it without writing a custom skill.

MCP servers are configured alongside skills but operate at a different layer. A skill is agent-native (SKILL.md + scripts, understood by the agent's reasoning loop). An MCP server is protocol-native (JSON-RPC, understood by the gateway's tool layer). Both are useful; the distinction matters for debugging and security. MCP tools run through the same exec policy and trust model as skill scripts.
