# Fast Track

Fast Track is PalladiumAI's outcome-oriented workspace layer. It gives users a single place to find the agents, tools, workflows, skills, templates and integrations that matter for a particular kind of work without duplicating those systems.

## Launch tracks

- Gaming
- Business
- Enterprise
- E-commerce
- Social Media
- App Development

Each track contains Start Here actions, ready-to-go agent entry points, tools and studios, workflows and automations, skills and templates, integrations, and recommended setup links.

## Architecture

Fast Track is a curated navigation/orchestration layer over the existing PalladiumAI surfaces. Agent Runtime remains authoritative for governed agent execution; Workflows remain authoritative for durable orchestration; Integrations/MCP remain authoritative for external capabilities; existing studios remain authoritative for creation; CRM/Knowledge/Social Operations retain their existing data and policy boundaries.

The launch version is configuration-driven in `src/lib/fast-track/fast-tracks.ts`. New tracks should normally be added to that registry rather than by creating new top-level applications or duplicating runtime/database systems.

The Fast Track page uses `?track=<id>` so a selected workspace can be linked directly while all tracks remain under the single `/fast-track` route.

## Persistence

The launch version does not add database tables or migrations. It only organises and deep-links existing live PalladiumAI capabilities. A future personalised "My Fast Track" feature can add persisted user configuration when required.
