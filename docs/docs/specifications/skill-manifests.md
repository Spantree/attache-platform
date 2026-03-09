# Skill Manifests

Skills are the primary extension point for Attaché agents. A skill teaches an agent *how* to do something — code review, research, deployment, whatever. Some skills are pure logic (just markdown and scripts). Others need infrastructure — Docker services, API keys, CLI tools.

The **manifest** is how a skill declares what it needs to run.

## Anatomy of a Skill

```
skills/
└── code-review/
    ├── SKILL.md                    # OpenClaw skill (agent instructions)
    ├── manifest.yml                # Dependencies and strategies
    ├── docker-compose.yml          # Optional: services this skill needs
    └── scripts/                    # Skill scripts (TypeScript, shell)
        ├── review.ts
        └── sonar-scan.ts
```

### SKILL.md

The OpenClaw skill file. This is what the agent reads to understand how to use the skill. No changes from the standard OpenClaw skill format.

### manifest.yml

Declares the skill's metadata, strategies, and requirements:

```yaml
name: code-review
description: Holistic code review with multiple analysis strategies
version: 1.0.0

# Strategies are different approaches the skill can take.
# The agent picks strategies based on context and available infrastructure.
strategies:
  native:
    description: Contextual review via OpenClaw (understands project intent and history)
    requires: []

  claude-code:
    description: Deep code analysis via Claude Code session dispatch
    requires:
      tools: [claude]

  codex:
    description: Code review via OpenAI Codex dispatch
    requires:
      env: [OPENAI_API_KEY]

  static-analysis:
    description: Static analysis for bugs, code smells, and vulnerabilities
    requires:
      services: [sonarqube]
      env: [SONAR_HOST_URL, SONAR_TOKEN]

# Which strategies to run by default (when all requirements are met)
default_strategies: [native, claude-code, static-analysis]
```

### docker-compose.yml

Standard Docker Compose file at the skill root. Each skill runs as its own independent compose project:

```yaml
services:
  sonarqube:
    image: sonarqube:community
    container_name: attache-sonarqube
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

## How Attaché Uses Manifests

### During Bootstrap

1. Scan all skills in the workspace for `manifest.yml` files
2. For each skill with a `docker-compose.yml`, run `docker compose up -d` in that skill's directory
4. Validate that declared `requires.env` variables are set (warn if missing)
5. Validate that declared `requires.tools` are installed (warn if missing)

### At Runtime

When the agent invokes a skill, it can check which strategies are available:

1. Read the manifest
2. For each strategy, check if requirements are satisfied (services running, env vars set, tools installed)
3. Run the default strategies that are available
4. Report which strategies were skipped and why

This means a skill degrades gracefully. If SonarQube isn't running, the code review skill still works — it just skips the static analysis strategy and uses native + Claude Code.

## Manifest Reference

```yaml
# Required
name: string                  # Unique skill identifier
description: string           # Human-readable description
version: string               # Semver

# Optional
strategies:
  <strategy-name>:
    description: string       # What this strategy does
    requires:
      services: [string]      # Docker service names (from this skill's compose file)
      tools: [string]         # CLI tools that must be on PATH
      env: [string]           # Environment variables that must be set

default_strategies: [string]  # Strategies to run by default

# Metadata
author: string
license: string
homepage: string
```

## Skill Categories

Skills fall into a few natural categories:

| Category | Examples | Typically needs services? |
|---|---|---|
| **Analysis** | code-review, security-scan, dependency-audit | Often (SonarQube, Snyk) |
| **Integration** | slack, discord, google, github | No (API keys only) |
| **Knowledge** | research, knowledge-base, RAG | Sometimes (vector DB) |
| **Operations** | deployment, monitoring, alerting | Often (Grafana, Prometheus) |
| **Productivity** | calendar, email, task management | No |
| **Development** | testing, linting, formatting | Rarely |

## Relationship to ClawHub

Skills published to [ClawHub](https://clawhub.com) can include manifests. When installed via `clawhub install`, Attaché reads the manifest and provisions any required services automatically.

Skills without manifests work fine — they're treated as pure logic skills with no infrastructure requirements.
