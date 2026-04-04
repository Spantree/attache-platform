---
title: Credential Managers
sidebar_position: 7
---

# Credential manager comparison

Evie Platform needs a way for agents to access secrets at runtime. The choice of credential manager affects your security posture, your platform compatibility, and whether you can implement approval workflows for sensitive access.

This page compares the options — from platform-native keystores to enterprise secrets managers — and identifies which ones support the mobile push approval pattern we recommend for high-sensitivity credentials.

:::info What's the push approval pattern?
When an agent requests a high-sensitivity credential (production database password, payment API key), the credential manager sends a push notification to your phone. You tap approve or deny. The agent only gets the secret after explicit human authorization. This is the gold standard for agent credential access — it means a compromised agent can't silently exfiltrate your most sensitive secrets.
:::

## Quick comparison

| Manager | Platform | CLI access | Headless/agent friendly? | Push approval? | Auto-rotation? | Cost |
|---|---|---|---|---|---|---|
| **1Password** | All | `op` CLI | ✅ Service account tokens | ❌ Not available | ❌ Manual only | $4-8/user/mo |
| **Bitwarden Secrets Manager** | All | `bws` CLI | ✅ Service account tokens | ❌ Requested, not shipped | ❌ Manual only | $6/user/mo |
| **macOS Keychain** | macOS | `security` CLI | ⚠️ GUI prompts on some operations | ❌ | ❌ | Free |
| **GNOME Keyring / libsecret** | Linux | `secret-tool` CLI | ⚠️ Requires D-Bus session | ❌ | ❌ | Free |
| **pass (password-store)** | Linux/macOS | `pass` CLI | ✅ GPG-based, fully headless | ❌ | ❌ | Free |
| **KeePassXC** | All | `keepassxc-cli` | ⚠️ Requires master password or GUI unlock | ❌ | ❌ | Free |
| **HashiCorp Vault** | All | `vault` CLI | ✅ Token/AppRole auth | ✅ **Yes** (PingID, Duo) | ✅ Dynamic secrets | Free (OSS) / Enterprise |
| **AWS Secrets Manager** | AWS | `aws` CLI | ✅ IAM auth | ❌ (but IAM MFA possible) | ✅ Lambda rotation | Pay-per-secret |
| **Doppler** | All | `doppler` CLI | ✅ Service tokens | ❌ | ✅ Lambda-based | $18+/user/mo |
| **CyberArk Conjur** | All | REST API | ✅ API key auth | ✅ **Yes** (CyberArk MFA) | ✅ Built-in | Enterprise |

## The push approval winners

Only two credential managers natively support the "agent requests secret → human approves via mobile push" workflow:

### HashiCorp Vault Enterprise

Vault is the only widely-used secrets manager with built-in, production-grade approval workflows for individual secret access.

**Control Groups** — Vault's [control groups](https://developer.hashicorp.com/vault/docs/enterprise/control-groups) let you require human authorization before a secret is released. The workflow:

1. Agent requests a secret via `vault read secret/production-db`
2. Vault holds the request and returns an accessor token
3. An authorized approver receives notification and authorizes via `vault write sys/control-group/authorize accessor=<token>`
4. Agent retries the request — secret is now available

**MFA with push notifications** — Vault Enterprise supports [PingID](https://developer.hashicorp.com/vault/docs/enterprise/mfa) and [Duo](https://developer.hashicorp.com/vault/docs/enterprise/mfa/mfa-duo) for MFA on secret access. From the Vault docs:

> "If PingID push is configured and enabled on a path, then the enrolled device of the user will get a push notification to approve or deny the access to the API."

With Duo, reading a secret triggers a push to your phone — the `vault read` command blocks until you approve or deny on your device.

**The catch:** Control groups and MFA push are **Enterprise features** (not in the open-source version). Vault Enterprise pricing is significant — typically $1+ per hour for a small cluster.

### CyberArk Conjur / Privileged Access Manager

CyberArk's enterprise PAM platform supports MFA-gated secret access with mobile push. It's designed for exactly this use case — privileged access to production credentials with human-in-the-loop approval. But it's full enterprise software with enterprise pricing and complexity.

## Platform-native options

### macOS Keychain

The `security` CLI can read and write keychain items:

```bash
# Store a secret
security add-generic-password -s "MY_API_KEY" -a "openclaw" -w "secret-value"

# Read a secret
security find-generic-password -s "MY_API_KEY" -a "openclaw" -w
```

**Pros:** Free, built into macOS, no additional software needed.

**Problems for agents:**
- Some operations trigger GUI authorization dialogs that are invisible on headless Mac minis
- No access scoping — anything running as the user can read any keychain item
- No audit logging of access
- No push approval, no rotation, no access policies

**Verdict:** Fine for bootstrapping (storing the 1Password service account token), but not suitable as the primary credential store for an agent deployment.

### GNOME Keyring / libsecret (Linux)

```bash
# Store a secret
secret-tool store --label="My API Key" service openclaw key MY_API_KEY

# Read a secret
secret-tool lookup service openclaw key MY_API_KEY
```

**Problems for agents:**
- Requires a D-Bus session — tricky in headless/SSH/systemd environments
- The "unlock on login" model assumes a GUI session exists
- No access scoping, no audit logging, no approval workflows

**Verdict:** Usable on Linux desktop deployments. Not suitable for headless servers.

### pass (password-store)

```bash
# Store a secret
echo "secret-value" | pass insert openclaw/MY_API_KEY

# Read a secret  
pass show openclaw/MY_API_KEY
```

**Pros:** GPG-based encryption, fully headless, git-backed history, simple and composable.

**Problems for agents:**
- GPG key management adds complexity
- No access scoping beyond file system permissions
- No push approval, no rotation
- Single-user design — no service account model

**Verdict:** Good option for Linux-based Evie Platform deployments where 1Password isn't available. The GPG key acts as the trust root instead of a service account token.

### KeePassXC

```bash
keepassxc-cli show database.kdbx /openclaw/MY_API_KEY -sa password
```

**Problems for agents:**
- Requires the master password on every CLI invocation (or the GUI to be running and unlocked)
- [Open issue](https://github.com/keepassxreboot/keepassxc/issues/12282) requesting CLI access when GUI is already unlocked — not yet implemented
- No service account model, no push approval, no rotation

**Verdict:** Not practical for autonomous agent use. Designed for interactive human use.

## Cloud secrets managers

### AWS Secrets Manager

```bash
aws secretsmanager get-secret-value --secret-id prod/db/password
```

**Pros:** IAM-based access control, automatic rotation via Lambda functions, audit logging via CloudTrail, encryption at rest.

**Push approval?** Not natively, but you could gate access behind an IAM role that requires MFA step-up. Not a true push-to-phone flow — more like "enter your TOTP code."

**Auto-rotation:** Yes — built-in support for RDS, DocumentDB, Redshift, and custom Lambda rotators.

**Best for:** Evie Platform deployments that already run on AWS, or when routing LLM inference through Bedrock.

### Doppler

```bash
doppler secrets get MY_API_KEY --plain
```

**Pros:** Developer-friendly, integrates with most CI/CD, automatic syncing to AWS/GCP/Azure, Lambda-based rotation.

**Push approval?** No.

**Best for:** Teams that want a managed secrets platform without running Vault infrastructure.

## Evie Platform's recommendation by deployment type

| Deployment | Recommended manager | Why |
|---|---|---|
| **macOS (standard)** | 1Password with scoped service account | Best CLI tooling, vault scoping, cross-platform |
| **macOS (high security)** | 1Password + secrets proxy daemon | Adds per-secret approval via DM, agent can't access `op` directly |
| **Linux** | pass (simple) or Vault OSS (advanced) | pass for single-operator; Vault for teams or when approval workflows are needed |
| **Enterprise / regulated** | HashiCorp Vault Enterprise | Only option with native push approval and control groups |
| **AWS-heavy** | AWS Secrets Manager | Native IAM integration, CloudTrail audit, Lambda rotation |
| **Maximum isolation** | Vault Enterprise + Evie Platform secrets proxy | Push approval from Vault + bloom filter scanning from Evie Platform |

## Building push approval without Vault Enterprise

If Vault Enterprise pricing is out of reach (it usually is for small teams), you can build an equivalent workflow using Evie Platform's secrets proxy pattern:

```
Agent requests credential
    → Secrets proxy intercepts
    → Sends DM via Discord/Slack/Telegram: 
      "Agent wants PROD_DB_PASSWORD for migration script. Approve?"
    → Waits for human response (tap a button on your phone)
    → On approval: reads from 1Password/pass/Keychain and returns value
    → On deny/timeout: rejects request, logs the attempt
```

This gives you push-approval semantics on top of any credential manager — even free ones like macOS Keychain or pass. The proxy is the gatekeeper; the underlying store just needs CLI access.

The Evie Platform secrets proxy is on our [roadmap](./index.md#roadmap). In the meantime, the DM approval pattern described in [Multiplayer](./multiplayer.md#secrets-approval-via-dm) works with any messaging channel you already use.
