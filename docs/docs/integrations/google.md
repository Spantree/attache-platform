---
title: Google Workspace
sidebar_label: Google Workspace
slug: /docs/integrations/google
---

# Google Workspace

Evie connects to [Google Workspace](https://workspace.google.com) through OAuth 2.0 tokens for both personal and work accounts. She handles email, calendar, contacts, and document operations.

## What It Does

**Gmail.** Search emails, read message content, draft replies, and manage the inbox. Evie never sends an email without explicit confirmation. She can draft, review, and queue messages, but the send trigger requires a clear "send it" from the human.

**Calendar.** Check upcoming events, identify scheduling conflicts, and provide context before meetings. Evie proactively surfaces events within the next 24 to 48 hours during heartbeat checks. She uses Zoom exclusively for meeting links, never Google Meet.

**Drive.** Read and search documents, create files, and organize content. Useful for pulling context from shared docs during research or project work.

**Contacts.** Look up contact information, find email addresses, and cross-reference with the knowledge base.

## How It Works

Evie uses the `gog` CLI (v0.9.0), a Go-based tool that wraps Google's APIs. Authentication is handled through stored OAuth tokens for each account, with the `--account` flag to switch between personal and work contexts. All operations go through Google's official APIs with scoped permissions.
