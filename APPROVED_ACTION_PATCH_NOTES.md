# PalladiumAI Approved External Actions — 2026-08-15

This batch turns selected Approval Centre decisions into real, server-side provider actions while preserving explicit human approval.

## What is live

- Email approvals create a **draft only** in Gmail or Outlook. They do not send mail.
- Calendar proposals create a real event in the connected Google or Microsoft calendar after approval.
- Slack messages can be prepared by an agent and posted only after approval.
- Calendar reads prefer a connected Google/Microsoft calendar and fall back to PalladiumAI scheduled tasks if neither is connected.
- Failed approved provider actions can be retried after reconnecting the integration. Retry uses the exact stored approved payload.
- HubSpot, Asana, Linear and Notion writes use the same approval-backed execution model.

## Safety controls

- Approval rows are conditionally claimed with `status = pending` before external side effects, preventing normal two-tab duplicate execution.
- Provider URLs, methods and auth headers are fixed server-side; the model cannot choose them.
- OAuth tokens are resolved server-side and never returned to the model/browser.
- Email recipient/subject headers reject CR/LF injection and payload sizes are bounded.
- Calendar start/end are validated and Google event creation uses `sendUpdates=none`.
- MCP cannot approve guarded actions; approvals must go through PalladiumAI's Approval Centre. MCP rejection remains allowed.
- Provider execution state is persisted separately from the human decision: `executing`, `succeeded`, or `failed`.

## OAuth scope changes

Existing connections may need to be reconnected once when their requested scopes have expanded:

- Google: `calendar.events`, `gmail.compose`, Drive read-only
- Microsoft: `Calendars.ReadWrite`, `Mail.ReadWrite`, `Files.Read`
- Slack: `chat:write` plus read scopes
- HubSpot: contact/deal read + write scopes
- Asana: workspace/project/task read + `tasks:write`
- Linear: `read` + `write`

## Database migration

Apply:

`supabase/migrations/20260815101000_approval_action_execution.sql`

It adds durable execution fields to `approval_requests` and registers the `slack_post` tool.

The connected-service write catalogue entry is added by:

`supabase/migrations/20260815113000_connected_service_approved_writes.sql`

## Verification

GitHub Actions runs Bun install, backend typecheck and Vitest on pushes to `main`.
