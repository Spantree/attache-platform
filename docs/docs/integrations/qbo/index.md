---
title: QuickBooks Online Integration
sidebar_label: Overview
sidebar_position: 1
slug: /docs/integrations/qbo
---

# QuickBooks Online Integration

Evie connects to Spantree's [QuickBooks Online](https://quickbooks.intuit.com) account to automate financial workflows. This is a private, single-company integration. The end users are Spantree, LLC and its parent company, Trifork US, Inc.

## What It Does

**Invoice management.** Query, filter, and create invoices by client. Supports customer-level filtering for clients like Switch, GATX, Delta, Vermeulens, and USAA.

**Financial reporting.** Profit and Loss, Balance Sheet, AR/AP aging, Cash Flow, and Trial Balance reports pulled directly from the QBO API.

**Customer lookup.** Search and list QBO customers by name or ID.

**Interdepartmental billing.** Automates Trifork business-unit-to-business-unit invoice creation for internal agreements.

## How It Works

Evie accesses QuickBooks data through Intuit's REST API using OAuth 2.0 authentication with the `com.intuit.quickbooks.accounting` scope. API calls are rate-limited (400 requests per minute with exponential backoff on throttling) and authenticated with rotating refresh tokens stored on Spantree's infrastructure with file-level access controls.

The skill is implemented as a Bun/TypeScript CLI module within Evie's skill system. It runs entirely on Spantree's hardware. No data passes through third-party middleware.

## Legal

- [End-User License Agreement](./qbo/eula)
- [Privacy Policy](./qbo/privacy)
- [Disconnection](./qbo/disconnect)
