# Attaché Credential Scanner — Design Spec

## Overview
A bloom filter-based credential scanner that detects potential secret exfiltration in outbound agent commands. Runs inline on exec calls, with near-zero performance overhead.

## Architecture

```
Agent exec call: curl -H "Authorization: Bearer sk_live_abc123..." https://api.stripe.com
    |
    v
[1] Static risk score check (is this a tier 3/4 action?)
    |
    v
[2] Bloom filter substring scan (does any substring match a known secret?)
    |
    v
[3] TruffleHog pattern match (does it match a known credential format?) [optional]
    |
    v
[4] Decision: allow / flag for supervisor / block + DM approval
```

## Components

### 1. Vault Sync (startup + periodic)

On gateway start and every N minutes:
1. Read all items from the configured 1Password vault via `op`
2. Extract credential values (passwords, API keys, tokens, notes tagged as secrets)
3. For each secret:
   - Add the full value to the bloom filter
   - If length >= 32: also add first-8 + last-8 substring (for partial match detection)
   - Store a metadata entry: item name, vault, length, last-rotated date (no actual values)
4. Persist bloom filter to disk for fast restart

**Privacy:** The bloom filter is one-way. You can check "is this string in the set?" but you cannot extract the original secrets from it. Safe to persist.

### 2. Bloom Filter

- Use a counting bloom filter (allows removal when secrets are rotated)
- Target false positive rate: 0.1% (1 in 1000)
- Expected set size: 200 secrets (typical vault)
- Optimal parameters: ~2.9KB memory, 10 hash functions
- Library: `bloom-filters` npm package or custom implementation

### 3. Substring Scanner

For each outbound exec command or tool invocation:
1. Extract the command string
2. Generate sliding window substrings:
   - Min window: 16 chars (shorter secrets are unlikely to be API keys)
   - Max window: 256 chars (covers most credential formats)
   - Step: 1 char
3. Check each substring against the bloom filter
4. On match: flag the action, log the match position (not the matched value)

**Performance:** For a 200-char command with 16-256 char windows:
- ~3,500 substring checks
- Each check: ~200ns (10 hash lookups)
- Total: ~0.7ms per command

### 4. Risk Scoring Integration

| Signal | Score Adjustment |
|---|---|
| Bloom filter match | +5 (high confidence credential detected) |
| TruffleHog pattern match | +3 (known credential format) |
| Command targets external domain | +2 |
| Command targets known-safe domain | -1 |
| Action approved in last 30 min | -2 (time decay) |
| Action approved in last 2 hours | -1 |

Thresholds:
- Score < 5: allow
- Score 5-7: log warning, supervisor review if available
- Score >= 8: block, send DM approval request

### 5. DM Approval Flow

When an action is blocked:
1. Send a message to the operator via configured DM channel (Discord, Slack, Telegram)
2. Include: action description (redacted), risk score, which signals triggered, timestamp
3. Wait for approval with configurable timeout (default: 5 min)
4. On approval: execute and cache approval for session (with time-decay)
5. On deny or timeout: reject and log

## Configuration

```json
{
  "security": {
    "credentialScanner": {
      "enabled": true,
      "vault": "Agent-Vault",
      "syncIntervalMinutes": 30,
      "bloomFilter": {
        "expectedItems": 200,
        "falsePositiveRate": 0.001
      },
      "scanning": {
        "minSecretLength": 16,
        "maxSecretLength": 256,
        "scanExec": true,
        "scanOutboundUrls": true,
        "scanMessageContent": false
      },
      "riskScoring": {
        "bloomMatchWeight": 5,
        "trufflehogMatchWeight": 3,
        "externalDomainWeight": 2,
        "approvalDecayMinutes": 30,
        "blockThreshold": 8,
        "warnThreshold": 5
      },
      "approval": {
        "channel": "discord",
        "timeoutSeconds": 300,
        "cacheApprovalMinutes": 60
      }
    }
  }
}
```

## Implementation Plan

### Phase 1: Bloom filter + exec scanning (MVP)
- Vault sync on startup
- Bloom filter construction
- Substring scanning on exec calls
- Console logging of matches
- ~2-3 days of work

### Phase 2: Risk scoring + DM approval
- Risk score accumulation per session
- Time-decay on approvals
- DM approval flow via existing messaging channels
- ~2-3 days of work

### Phase 3: TruffleHog integration + dashboard
- Pattern matching layer for known credential formats
- Web dashboard showing risk scores, blocked actions, approval history
- ~3-5 days of work

### Phase 4: Supervisor agent
- Secondary LLM evaluation for ambiguous cases
- Configurable model (cheap/fast model like Haiku)
- ~2-3 days of work

## Total estimated effort: 10-14 days

## Open Questions
- Should we scan tool results (what the agent reads back) in addition to outbound commands?
- Should the bloom filter cover memory file writes? (prevents credential persistence)
- How do we handle secrets that change frequently? (counting bloom filter handles removal, but sync frequency matters)
- Should this be an OpenClaw plugin (benefiting the whole ecosystem) or an Attaché-specific feature?
