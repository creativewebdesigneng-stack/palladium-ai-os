# Approved Integration Writes

This patch adds an approval-backed `connected_service_write` agent tool and extends the existing single-use approval executor.

## Live approved actions

- HubSpot: update a contact or deal using an allow-listed set of standard properties.
- Asana: create a task or update selected task fields.
- Linear: create or update an issue using fixed GraphQL documents and variables only.
- Notion: create a child page under an approved parent page.

No action accepts an arbitrary URL, HTTP method, auth header, access token, SOQL query, or GraphQL document.

## Central approval enforcement

`executeTool()` must stop tools whose resolved grant requires approval unless the tool is explicitly designed to queue its own approval request. This closes the previous gap where `requiresApproval` could be calculated but not enforced at execution time.

## Reconnect requirement

Existing OAuth connections may need reconnecting after deployment because HubSpot, Asana and Linear now request write permissions needed for these approved actions. Notion write capability is configured in the Notion integration capabilities and must include Insert Content for page creation.

## OAuth/API compatibility

- Notion OAuth code exchange and refresh use HTTP Basic client authentication with a JSON body.
- Notion API requests use `Notion-Version: 2026-03-11`.
- HubSpot requests contact/deal write scopes.
- Asana requests workspace/project/task read scopes plus `tasks:write`.
- Linear requests `read` + `write`.

## Verification

Run the repository's Bun verification after syncing the runtime registry:

```bash
bun install --frozen-lockfile
bun run backend:check
bun run build
```
