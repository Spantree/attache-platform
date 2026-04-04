---
title: Slack
sidebar_label: Slack
slug: /docs/integrations/slack
---

# Slack

Evie participates in [Slack](https://slack.com) as a bot user across Spantree's workspace. She reads channels, responds to mentions, searches message history, and posts updates.

## What It Does

**Channel monitoring.** Evie watches specific channels for mentions, questions, and relevant activity. She responds when asked directly and stays quiet when the conversation doesn't need her.

**Message search.** Full-text search across synced Slack messages stored in Postgres. Useful for finding past decisions, digging up context, and answering "didn't we talk about this?" questions.

**Thread replies.** Evie replies in threads to keep conversations organized. She uses a dedicated bot token so her messages are clearly attributed.

**Proactive updates.** During heartbeat checks, Evie scans monitored channels for new activity and surfaces anything that needs attention.

## How It Works

Evie connects through a Slack App bot token with scoped permissions for reading channels, posting messages, and searching history. Messages are synced to a local Postgres database for fast search and context retrieval. The sync runs periodically and on demand.

The skill is a Bun/TypeScript module that wraps Slack's Web API. All message data stays on Spantree's infrastructure.
