# Connected Service Runtime Patch

Added a server-only, read-only OAuth integration bridge for agent runs.

## Added
- `src/lib/integrations/connected-service.server.ts`
  - Fixed provider/action whitelist.
  - Server-side OAuth token lookup/refresh.
  - Bounded query/resource/limit inputs.
  - No model-supplied URLs, headers, methods or tokens.
  - Read operations for Google, Microsoft 365, Slack, HubSpot, Notion, Asana and Linear.
- `src/lib/runtime/__tests__/connected-service.test.ts`
  - Whitelist, limit, resource-id and arbitrary-host safety tests.
- `supabase/migrations/20260815093000_connected_service_tool.sql`
  - Adds `connected_service` to the tool catalogue.

## Changed
- `src/lib/runtime/tools.server.ts`
  - Registers `connected_service` in the executable runtime registry.
- `src/lib/integrations/providers.ts`
  - Connected providers advertise the OAuth-backed runtime tool rather than generic unauthenticated HTTP as their integration path.

## Deliberately constrained
- Read actions never accept a model-supplied provider URL or access token.
- Consequential provider writes use the separate approval-backed executor.
- Salesforce remains on its dedicated tenant-hosted read executor because Salesforce requires its OAuth `instance_url`.

## Verification
GitHub Actions runs the Bun backend gate on every push to `main`.
