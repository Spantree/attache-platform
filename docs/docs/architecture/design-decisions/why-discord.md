---
sidebar_label: Why Discord
---

# Why Discord

## Problem

Evie Platform agents need a messaging surface for human-agent interaction: approval prompts, status updates, conversational commands, and trust-tier escalations. The channel needs to support structured conversations that stay organized over time.

## Options Considered

1. **Slack** -- dominant in enterprise, rich API, but threads are unnamed and don't auto-hide
2. **Discord** -- named threads, auto-hide for inactive threads, strong bot API
3. **Telegram** -- lightweight, good bot API, limited thread support
4. **Signal** -- privacy-first, minimal bot support
5. **Custom web UI** -- full control, high development cost

## Decision

Discord as the V1 messaging channel. Slack, Telegram, and Signal come later as additional surfaces.

Discord's named threads solve a real organizational problem. When your agent opens a thread called "PR Review: auth-middleware-rewrite," you can find it by name, archive it, and come back to it. Slack threads are unnamed replies to a message -- they disappear into the scroll. For an agent that opens dozens of threads per day, the naming matters.

Inactive threads auto-hide after a configurable period. Your channel stays clean without manual archiving. Active conversations surface; finished ones fade.

The personal server model (one Discord server per agent) creates a defensible 1:1 space. Your agent's server is yours. No shared workspace admins, no IT policies restricting bot permissions, no enterprise licensing.

## Tradeoffs

- **Won.** Named threads keep agent conversations organized and searchable.
- **Won.** Auto-hide prevents channel clutter from resolved conversations.
- **Won.** Personal server model -- no dependency on organizational Slack admin permissions.
- **Lost.** Enterprise teams already on Slack face friction adopting a second messaging tool. The Slack integration is planned but not yet built.
- **Lost.** Discord's reputation as a "gaming platform" can create perception issues in professional contexts.
- **Lost.** No built-in email integration. Slack Connect bridges to external parties; Discord doesn't.
