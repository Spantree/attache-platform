---
title: Float
sidebar_label: Float
slug: /docs/integrations/float
---

# Float

Evie logs time entries and manages timesheets through [Float](https://www.float.com)'s API. She handles the gap between scheduled time and actual hours worked.

## What It Does

**Time logging.** Create, update, and delete time entries. Evie can log time against specific projects and phases based on activity signals from other sources (Slack, calendar, git commits).

**Timesheet review.** Compare scheduled hours against logged actuals. Surface discrepancies and missing entries for the current or previous week.

**Timesheet interviews.** Evie walks through the week one day at a time, gathering activity signals and asking targeted questions to fill in time entries. The interview is conversational, not a form.

**Project lookup.** Search Float projects, check allocations, and view team schedules.

## How It Works

Evie connects to Float through its REST API with an API key. The skill is a Bun/TypeScript CLI that handles time entry CRUD, project queries, and the interactive timesheet interview workflow. All data stays on Spantree's infrastructure.
