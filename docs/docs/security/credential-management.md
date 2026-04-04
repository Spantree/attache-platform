---
sidebar_label: Credential Management
draft: true
---

# Credential Management

:::caution Draft
This page is a stub. Full implementation details are coming.
:::

Evie Platform treats credential management as a graduated system, not a binary gate. The agent earns access incrementally, credentials stay invisible to the LLM, and high-risk operations require explicit human approval.

## Four-Tier Trust Model

Every credential-bearing action falls into one of four tiers, matching the [progressive trust model](/security/#progressive-trust):

| Tier                       | Policy                      | Credential Behavior                                                                   |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| **Tier 1: Run Freely**     | Read-only operations        | No credentials needed, or credentials auto-injected silently                          |
| **Tier 2: Pre-approved**   | Reversible write operations | Credentials injected from vault via allowlist. No human prompt.                       |
| **Tier 3: Approve Once**   | External side effects       | Agent requests credential through proxy. You approve once per session via Discord DM. |
| **Tier 4: Always Approve** | High-consequence operations | Every use requires explicit approval. Discord yes/no prompt with context.             |

The tier assignment is per-credential, not per-action. Your GitHub token might be tier 2 (pre-approved for commits and PRs) while your production database password is tier 4 (always approve).

## Bitwarden as Vault

Evie Platform uses Bitwarden as the credential vault. 1Password was the original default and remains supported, but Bitwarden is the recommended choice going forward.

**Why not HashiCorp Vault?** HashiCorp Vault is designed for enterprise secret management at scale -- dynamic secrets, lease rotation, policy engines. For a single-agent platform, it's overengineered and expensive. Bitwarden provides what Evie Platform needs: encrypted storage, CLI access, organizational vaults, and mobile push approval -- at a fraction of the cost.

Credentials are organized in scoped vaults:

- **Agent vault** -- credentials the agent uses for integrations (API keys, OAuth tokens)
- **Infrastructure vault** -- credentials for platform services (Postgres passwords, Tailscale auth keys)
- **Personal vault** -- your credentials that the agent should never access directly

## Agent-Blind Injection

The core security principle: **PIDs never see secrets**. The agent process (and by extension, the LLM) never has direct access to credential values.

The secrets proxy daemon sits between the agent and Bitwarden. When a skill needs an API key:

1. The skill requests a credential by name through the proxy
2. The proxy checks the credential's tier and allowlist
3. For tier 3 and 4 credentials, the proxy sends a Discord DM asking for approval
4. You tap yes or no from your phone
5. The proxy injects the credential into the environment variable or HTTP header at the tool execution layer
6. The LLM context never contains the credential value

Even if the agent's context is fully compromised via prompt injection, the attacker gets credential names, not credential values.

## Risk-Scoring Proxy

A separate proxy service assigns risk scores to credential requests based on:

- **Credential tier** -- base risk from the tier assignment
- **Request context** -- what tool is requesting the credential and why
- **Recency** -- recently-approved credentials decay to lower risk scores; stale approvals climb back
- **Frequency** -- unusual access patterns (a credential requested ten times in a minute) trigger escalation

The proxy runs as its own process, isolated from the agent runtime. It maintains an audit log of every credential request, approval, denial, and injection.

## Discord Approval Prompts

For tier 3 and 4 operations, the proxy sends a structured Discord DM:

```
🔐 Credential Request
Skill: slack-integration
Credential: SLACK_BOT_TOKEN
Tier: 3 (approve once per session)
Context: Posting status update to #general

✅ Approve  ❌ Deny
```

You respond with a reaction or button tap. Approved tier 3 credentials remain available for the rest of the session. Tier 4 credentials require approval every time.

If you don't respond within a configurable timeout (default: five minutes), the request is denied automatically. The agent receives a "credential unavailable" response and can choose to skip the operation or ask you directly.
