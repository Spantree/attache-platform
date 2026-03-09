# Service Architecture

Attaché uses Docker Compose as its service layer. The base platform ships required services (Supabase). Skills can add optional services via their own compose files. Docker Compose's native multi-file merge handles the assembly — no custom tooling.

## Design Principles

- **Compose files all the way down.** No abstraction layer, no custom YAML format. Standard `docker-compose.yml` everywhere.
- **Ansible orchestrates, Compose runs.** Ansible discovers compose files and runs `docker compose up`. Compose manages the actual containers.
- **Skills own their services.** If a skill needs SonarQube, it ships a compose file for SonarQube. Attaché doesn't know or care what SonarQube is.
- **Graceful degradation.** If a service isn't running, skills that need it skip those strategies. Nothing crashes.

## Base Services

Every Attaché agent runs these services. They're defined in the base platform's compose file:

```yaml
# ~/.attache/base/docker-compose.yml
services:
  supabase-db:
    image: supabase/postgres:15.6.1.143
    container_name: attache-supabase-db
    ports:
      - "${SUPABASE_DB_PORT:-65432}:5432"
    volumes:
      - supabase-db-data:/var/lib/postgresql/data
      - ./services/supabase/migrations:/docker-entrypoint-initdb.d
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  supabase-studio:
    image: supabase/studio:latest
    container_name: attache-supabase-studio
    ports:
      - "${SUPABASE_STUDIO_PORT:-65433}:3000"
    environment:
      STUDIO_PG_META_URL: http://supabase-meta:8080
      SUPABASE_URL: http://supabase-kong:8000
    depends_on:
      supabase-db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  supabase-db-data:
```

### What Supabase Provides

Supabase is the backbone for all structured data:

| Layer | What it stores | Postgres features used |
|---|---|---|
| **Knowledge** | basic-memory entities, relations, embeddings | pgvector, tsvector, pg_trgm |
| **Activity** | Slack messages, meeting transcripts, calendar events | FTS, JSONB |
| **Identity** | People crosslinks, match candidates (MDM) | Foreign keys, indexes |
| **Agent state** | Session metadata, credential references | Standard tables |

The base platform runs migrations on first boot to set up the required schemas, extensions (`pgvector`, `pg_trgm`), and tables.

## Skill Services

Skills add services via their own `docker-compose.yml`. Attaché discovers and merges them automatically.

### Example: Code Review Skill

```yaml
# skills/code-review/services/docker-compose.yml
services:
  sonarqube:
    image: sonarqube:community
    container_name: attache-sonarqube
    ports:
      - "9000:9000"
    volumes:
      - sonarqube-data:/opt/sonarqube/data
    environment:
      - SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true
    restart: unless-stopped

volumes:
  sonarqube-data:
```

### Example: Monitoring Skill

```yaml
# skills/monitoring/services/docker-compose.yml
services:
  grafana:
    image: grafana/grafana-oss
    container_name: attache-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped

  prometheus:
    image: prom/prometheus
    container_name: attache-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./services/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

volumes:
  grafana-data:
```

## How Compose Files Are Merged

Docker Compose natively supports multiple `-f` flags. Later files override earlier ones:

```bash
docker compose \
  -f ~/.attache/base/docker-compose.yml \
  -f ~/.openclaw/workspaces/main/skills/code-review/services/docker-compose.yml \
  -f ~/.openclaw/workspaces/main/skills/monitoring/services/docker-compose.yml \
  up -d
```

Ansible handles the discovery and flag assembly:

1. Always include `~/.attache/base/docker-compose.yml`
2. Scan all skills in `workspaces/main/skills/` for `services/docker-compose.yml`
3. Build the `-f` flag list
4. Run `docker compose up -d`
5. Write a convenience script at `~/.attache/compose.sh` that captures the full command

### Container Naming Convention

All Attaché-managed containers use the `attache-` prefix:

```
attache-supabase-db
attache-supabase-studio
attache-sonarqube
attache-grafana
```

This avoids conflicts with any other Docker workloads on the machine.

## Environment Variables

Service configuration uses environment variables, stored in `~/.attache/.env`:

```bash
# Base services
POSTGRES_PASSWORD=<generated-on-first-boot>
SUPABASE_DB_PORT=65432
SUPABASE_STUDIO_PORT=65433

# Skill services (added as skills are installed)
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN=<generated-after-sonarqube-init>
```

Ansible generates the `.env` file during bootstrap. Skill infra playbooks append their variables.

## Docker Runtime

Attaché uses **Colima** as the Docker runtime on macOS — lightweight, CLI-native, no GUI dependency:

```yaml
# ansible/roles/docker/defaults/main.yml
docker_runtime: colima
colima_cpu: 4
colima_memory: 8
colima_disk: 60
colima_mount_type: virtiofs
```

The base platform installs Colima via Homebrew and starts it with appropriate resource limits. Docker Desktop is explicitly *not* used — it has permission issues with agent user home directories and requires a GUI session.

## Lifecycle Commands

```bash
# Start all services
~/.attache/compose.sh up -d

# Stop all services
~/.attache/compose.sh down

# View running services
~/.attache/compose.sh ps

# View logs for a specific service
~/.attache/compose.sh logs -f sonarqube

# Restart a single service
~/.attache/compose.sh restart sonarqube
```

## Ansible's Role

Ansible handles the *orchestration* of Docker Compose, not the containers themselves:

| Ansible does | Docker Compose does |
|---|---|
| Install Colima + Docker CLI | Run containers |
| Discover skill compose files | Network between services |
| Generate `.env` with credentials | Mount volumes |
| Run `docker compose up -d` | Health checks |
| Run migrations after DB is healthy | Restart policies |

This separation means you can always `docker compose` directly for debugging, and Ansible re-runs are idempotent.
