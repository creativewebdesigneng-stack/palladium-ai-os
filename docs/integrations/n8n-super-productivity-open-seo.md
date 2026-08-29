# n8n + Super Productivity + OpenSEO audit

## Licensing

- n8n: Sustainable Use / fair-code. No n8n implementation source is copied into PalladiumAI. Only clean-room interoperability concepts are used.
- Super Productivity: MIT.
- OpenSEO: MIT.

## Capability mapping

### n8n
PalladiumAI already owns the workflow runtime, visual Automation Studio, workflow queue, approvals, triggers, templates/import, integrations, MCP, agent runtime and audit trail. A second workflow engine would duplicate core architecture.

Added instead:
- safe recognition of n8n-style workflow JSON in the existing Workflows import path;
- translation of supported manual/schedule/webhook triggers and bounded delay, approval, notification and AI-agent nodes into PalladiumAI's existing workflow definition;
- fail-closed rejection for unsupported node types;
- every translated workflow is saved as a draft for operator review before activation.

### Super Productivity
PalladiumAI already has Tasks, Projects, Kanban/calendar/timeline views and agent task execution. A separate productivity app would duplicate task ownership.

Added instead:
- first-class focus/time sessions on the existing Tasks page;
- active-session protection so only one running focus session exists per user;
- tracked session duration and summary statistics;
- owner-scoped RLS persistence.

### OpenSEO
SEO operations are a new business capability, so a dedicated `SEO Studio` page is appropriate.

Added:
- SEO projects by domain;
- provider-neutral keyword, rank, backlink and audit snapshots;
- `seo_ops` agent tool through the existing Harness and tool-execution audit path;
- no credential storage in SEO tables or agent input;
- external providers remain the responsibility of PalladiumAI Integrations/MCP/browser tooling rather than a duplicate secret/provider stack.

## Deliberate non-duplication

This batch does not add a second workflow executor, scheduler, task system, integration vault, MCP server, browser engine, model gateway, approvals system or audit system.
