---
title: Disconnection
sidebar_label: Disconnect
sidebar_position: 4
slug: /docs/integrations/qbo/disconnect
---

# Disconnection

If the Evie QuickBooks Online integration is disconnected, whether through Intuit's App Center or by revoking access in QuickBooks Online settings, the following happens:

1. OAuth tokens are invalidated and can no longer access QuickBooks data.
2. Any locally stored OAuth credentials on Spantree's infrastructure are deleted.
3. No financial data is retained. Evie does not persistently store QuickBooks data; everything is processed in-memory during the active session.

## How to Disconnect

**From QuickBooks.** Go to Settings, then Manage Apps, find "Evie," and disconnect.

**From Intuit App Center.** Visit apps.com, find the Evie integration, and disconnect.

## Reconnecting

To reconnect after disconnection, an authorized Spantree administrator must re-authorize the Application through the OAuth 2.0 flow.

## Contact

Spantree, LLC
227 W Monroe St, Suite 2100
Chicago, IL 60606
support@spantree.net
