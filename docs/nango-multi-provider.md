# Nango multi-provider setup

PalladiumAI supports native OAuth and Nango side-by-side. Native connections are used first. If a compatible native credential is unavailable, the runtime uses the authenticated user's matching Nango connection.

## Security contract

- Nango secret keys, provider credentials, connection IDs, and proxy headers stay on the server.
- Connect sessions are short-lived and restricted to one configured integration.
- Every connection is tagged with the authenticated PalladiumAI user ID.
- Signed auth webhooks persist connection state and ignore unknown or unowned events.
- Curated reads can use the fixed `connected_service` allow-list. Dynamic actions are resolved against Nango's typed provider templates; the model cannot invent an action, URL, header, token, or credentials.
- Dynamic read-only actions activate just in time and can run autonomously under the agent's policy. Unknown, write, and destructive actions use the existing immutable approval request lifecycle.

## Environment configuration

Keep these values in the Lovable production environment, never in `VITE_` variables or browser code.

| Palladium provider | Optional ID override              | Runtime capabilities                                                 |
| ------------------ | --------------------------------- | -------------------------------------------------------------------- |
| GitHub             | `NANGO_GITHUB_INTEGRATION_ID`     | repositories, branches, commits, paths, bounded files                |
| Google Workspace   | `NANGO_GOOGLE_INTEGRATION_ID`     | Calendar and Drive reads; approved Gmail and Calendar writes         |
| Microsoft 365      | `NANGO_MICROSOFT_INTEGRATION_ID`  | Calendar, OneDrive and Mail reads; approved Mail and Calendar writes |
| Slack              | `NANGO_SLACK_INTEGRATION_ID`      | channel/history reads; approved message posting                      |
| HubSpot            | `NANGO_HUBSPOT_INTEGRATION_ID`    | contact/deal reads; approved contact/deal updates                    |
| Salesforce         | `NANGO_SALESFORCE_INTEGRATION_ID` | bounded account and opportunity searches                             |
| Notion             | `NANGO_NOTION_INTEGRATION_ID`     | search; approved page creation                                       |
| Asana              | `NANGO_ASANA_INTEGRATION_ID`      | workspace/task reads; approved task creation and updates             |
| Linear             | `NANGO_LINEAR_INTEGRATION_ID`     | issue search; approved issue creation and updates                    |

The shared server configuration also requires:

- `NANGO_SECRET_KEY`
- `NANGO_WEBHOOK_SIGNING_KEY`
- `APP_ORIGIN=https://palladium-ai-os.lovable.app`

The provider-specific variables are optional overrides. Without them, PalladiumAI uses stable
IDs (`github-getting-started` and `palladium-<provider>`). A platform administrator can create
any missing fixed-list records from **Admin → Integration Management → Provision missing
providers**. This calls Nango's server API; it never sends the Nango key to the browser.

Provider records are also created just in time. When an authenticated user selects **Connect**
on the normal Integrations page, the server checks the fixed integration ID, creates it when
missing, and then opens a provider-restricted Connect session. A conflicting ID is rejected and
never overwritten. This makes the admin provisioning control optional.

The normal Integrations page also loads Nango's live provider catalogue from `GET /providers`.
Providers outside PalladiumAI's curated list can be searched and connected immediately. Their
integration ID is generated deterministically as `palladium-<provider>`, the provider is verified
against Nango before creation, and the connection is stored under the authenticated PalladiumAI
user. After connection, PalladiumAI discovers its typed action templates and shows autonomous-read
and approval-action counts. Templates activate individually on first use, avoiding unused bulk
deployments. A provider with no advertised or deployed actions remains **Account only**.

The runtime exposes two generic tools: `nango_capabilities` returns exact action names and input
schemas for the current user's connected accounts, while `nango_action` re-verifies ownership,
schema availability, input bounds, and risk at execution time. Read-only verbs run immediately
unless the agent has a stricter approval policy. Writes, destructive actions, and unclassified
actions store the exact provider/action/input payload in `approval_requests` and execute only after
the owner approves it. Existing agents with `connected_service` automatically inherit this pair.

For scoped Nango API keys, dynamic execution also needs `environment:functions:list`,
`environment:deploy`, and `environment:actions:execute`. Provider-template discovery itself does
not require a special scope. A legacy full environment secret key continues to cover these calls.

The production webhook URL is:

`https://palladium-ai-os.lovable.app/api/public/integrations/nango-webhook`

## Adding a provider

1. Use the platform-admin provisioning control, or create the provider integration in the
   production Nango environment with the same integration ID.
2. Configure only the OAuth scopes required by the capabilities in the table above.
3. Copy its integration ID into the matching Lovable server variable.
4. Confirm the Nango environment webhook URL and signing key are unchanged.
5. Redeploy PalladiumAI so the new server variable is loaded.
6. Open **Integrations**, connect the provider, and run **Test connection**.
7. For a write-capable provider, create a harmless approval request and confirm execution occurs only after approval.

An unconfigured provider remains visible as **Setup required**. It cannot create a Connect session or run an agent action.

## Production verification

- The Lovable deployment commit matches the intended GitHub `main` commit.
- A forged webhook signature returns HTTP `401` with `{ "accepted": false }`.
- The `integrations` row uses `provider = nango_<provider>`, `integration_type = nango`, and `status = connected`.
- `config.connection_id` and `config.integration_id` are present, while `last_error` is null.
- **Test connection** returns a live provider identity response.
- Disconnect removes both the Nango connection and the user's persisted integration row.
