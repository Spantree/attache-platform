---
title: Linear
sidebar_label: Linear
slug: /docs/integrations/linear
---

# Linear

Evie manages [Linear](https://linear.app) projects, issues, milestones, and cycles through the GraphQL API. She handles project planning, sprint tracking, and task synchronization.

## What It Does

**Issue management.** Create, update, and close issues. Assign team members, set priorities, and move issues through workflow states.

**Project tracking.** Monitor project progress, check milestone completion, and surface blockers. Evie can generate status summaries for standups and check-ins.

**Cycle management.** Track sprint cycles, review velocity, and help plan upcoming work.

**Task synchronization.** When tasks are captured elsewhere (voice memos, Slack conversations, meeting notes), Evie can create corresponding Linear issues with appropriate labels, priorities, and assignments.

## How It Works

Evie connects to Linear through its GraphQL API with an API key. The skill is a Bun/TypeScript module that handles query construction, pagination, and response parsing. All requests go directly to Linear's API from Spantree's infrastructure.
