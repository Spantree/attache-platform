---
title: GitHub
sidebar_label: GitHub
slug: /docs/integrations/github
---

# GitHub

Evie works with [GitHub](https://github.com) repositories through both the `gh` CLI and a GitHub App installation. She manages issues, reviews pull requests, monitors CI runs, and dispatches coding agents to implement fixes.

## What It Does

**Issue management.** Create, comment on, and close issues. Evie posts closing comments, references issues in commits, and maintains issue hygiene across repositories.

**Pull request review.** Evie reviews PR diffs, checks for code quality, and leaves comments directly on GitHub. Slack gets a link and a summary; GitHub is the canonical location for review feedback.

**CI monitoring.** Check workflow run status, view logs, and surface failures. Evie can re-run failed jobs when the failure is transient.

**Coding agent dispatch.** When an issue needs implementation, Evie spins up a Claude Code session in an isolated git worktree, assembles context from the issue body and codebase, and monitors the session to completion. The result is a PR linked back to the original issue.

## How It Works

Evie authenticates via a GitHub App (App ID 2837774, slug `evie-assist`) with repository-scoped permissions. The `gh` CLI handles most operations; the App provides webhook event handling for mentions and PR review requests.

Coding agent sessions run in tmux on Spantree's hardware. Evie sends keystrokes, reads pane output, and monitors for completion signals. Each session gets its own worktree branch for isolation.
