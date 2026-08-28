# wacrm → PalladiumAI WhatsApp CRM mapping

Source archive: `wacrm-main(1).zip` (wacrm 0.8.0). License: MIT.

## Reused concepts

- WhatsApp shared inbox and conversation status
- CRM-linked WhatsApp threads
- outbound message drafts and delivery-state persistence
- template-oriented broadcast planning with bounded recipient lists
- provider capability discovery for WhatsApp/Meta
- security posture: no browser-side credential storage

## PalladiumAI systems reused instead of duplicated

- `crm_contacts` remains the canonical contacts, pipeline and customer activity store
- PalladiumAI Integrations remains the authentication/provider transport layer
- Agent Runtime/Harness and immutable approvals remain authoritative for external writes
- PalladiumAI Workflows remains the automation engine
- PalladiumAI MCP remains the MCP subsystem
- existing auth, RLS, audit, API/developer and notification systems remain authoritative

## Deliberately not copied as parallel systems

- wacrm Supabase auth/account model
- wacrm API-key subsystem
- wacrm MCP server
- wacrm no-code workflow engine
- wacrm deployment/runtime stack
- direct Meta token storage

## Safety boundary

WhatsApp CRM persists drafts, inbox state and broadcast plans. It does not introduce a direct unaudited send path. Live WhatsApp/Meta actions are discovered from PalladiumAI's provider-neutral integration runtime and external side effects continue through existing integration/Harness/approval controls.
