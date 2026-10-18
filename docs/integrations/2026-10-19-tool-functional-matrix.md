# All registered agent tools — functional verification matrix

The 41 rows below separate functional handler tests from live acceptance. Fixtures
exercise real tool implementations with in-memory persistence or intercepted HTTP;
they are **not** simulated live acceptance results. External operations are not
certified merely because their grant/denial tests pass. All existing provider,
security, workflow and tool suites also run in the full repository test suite.

| Tool | Functional evidence | Live status |
| --- | --- | --- |
| current_time | Actual clock bounded by test start/end | Agent path blocked by QA provider/policy |
| calculator | Real arithmetic output 708; malformed/nonfinite inputs fail | Agent path blocked by QA provider/policy |
| data_analysis | Real count/sum/mean/min/max/median | Agent path blocked by QA provider/policy |
| web_search | Actual handler parses intercepted provider HTML | Search-provider live acceptance pending |
| web_fetch | Actual handler strips scripts; HTTP errors fail | Separate agent-tool live acceptance pending |
| http_request | Actual HTTP failure handling; no false success on 503 | Separate agent-tool live acceptance pending |
| memory_search | Existing memory/runtime regression suites | Not live verified in this audit |
| memory_write | Existing memory/runtime regression suites; approvals retained | No live memory mutation performed |
| request_approval | Actual fixture insertion; absent receipt fails | Live generic resumption not verified |
| browser | Existing provider/session/domain policy suites | Real provider path verified via browser_task |
| browser_task | Real approved two-step navigation/extraction and complete receipt | Live pass: task 0b2a7631-da37-496b-b90b-dba9025915d0 |
| connected_service | Existing connected-service/MCP routing tests | No connected account in QA-owner inventory |
| integration_capabilities | Existing connected-service/MCP routing tests | No connected account or MCP server |
| integration_action | Existing connected-service/MCP immutable action tests | No connected account or MCP server |
| nango_capabilities | Existing alias and transport routing tests | No connected account or MCP server |
| nango_action | Existing alias and immutable action tests | No connected account or MCP server |
| connected_service_write | Existing approval/transport tests; absent receipt fails | No live external write attempted |
| github_write | Existing dedicated GitHub write tests | No connected QA GitHub account; no write attempted |
| file_analysis | Real vault document handler reads fixture; missing document fails | Live vault acceptance pending |
| calendar | Existing communication/approval tests | No connected calendar; no live event created |
| email_draft | Real approval queue insertion; no outbound fetch; missing receipt fails | No connected mailbox; no draft created externally |
| email_send | Real approval queue insertion; no outbound fetch; missing receipt fails | No connected mailbox; no email sent |
| slack_post | Real approval queue insertion; no outbound fetch; missing receipt fails | No connected Slack account; no message posted |
| shopping_search | Existing browser/search/domain tests | No live retailer acceptance performed |
| prepare_purchase | Real item/delivery total and approval preparation; no payment | No live purchase or payment performed |
| database_query | Real allowed-table fixture retrieval; arbitrary table rejected | Live owner-scoped database tool acceptance pending |
| code_exec | Existing sandbox/Harness/approval regression suites | No live code execution authorised or performed |
| skill_script | Existing script-policy, approval and runner suites | No user skill-script live execution performed |
| social_ops | Actual list_posts excludes another owner | Publication requires connected provider and approval |
| html_studio | Actual list_documents excludes another owner | Live create/update/export pending |
| agent_workspace | Actual list_workspaces excludes another owner | Live workspace mutation pending |
| seo_ops | Actual list_projects excludes another owner | Live provider-backed SEO acceptance pending |
| app_studio | Actual list_apps excludes another owner | Live create/query acceptance pending |
| voxel_studio | Actual binary VOX creation and inspect round trip | No external provider needed for tested operation |
| three_d_studio | Actual job listing excludes another owner | Generation requires configured provider/worker |
| game_foundry | Actual project listing excludes another owner | Generation/conversion requires configured workers |
| cinema_studio | Actual project listing excludes another owner | Rendering requires configured workers/providers |
| short_video | Actual job listing excludes another owner; returned errors fail | Rendering requires configured worker/provider |
| astra_vision | Existing dedicated vision-tool tests | Model/artifact live acceptance pending |
| astra_async_workflow | Existing dedicated async-workflow tests | Live durable workflow acceptance pending |
| astra_orchestrate | Existing dedicated orchestration-tool tests | Live specialist/workforce acceptance pending |

## Functional defects repaired

- Core and extension wrappers now record returned error/ok=false/nested result.ok=false
  as failed executions rather than succeeded. Original output remains available to
  the model; a tool failure is not converted into invented success.
- Queued approval operations require a returned persisted receipt id, including
  MCP/connected writes, generic approvals, calendar, email, Slack and purchases.
- Purchase preparation cannot claim an approved queue if approval persistence fails.
  No code path in these tests authorises a payment.
- Calculator rejects unsupported characters instead of silently rewriting arithmetic.

## Live constraints

The signed-in QA Feature agent's live attempt stopped at provider preflight:
Gemini is not configured for that Preview. The QA owner has zero integrations and
zero external MCP servers. Existing approval requirements were not relaxed. Some
approval-gated extension paths have no applicable resume executor and fail closed;
these are not labelled live verified. The negative live browser-domain attempt
9b211c60-9ea3-4f49-9c36-6337c30e069e was declined by the model without a tool call,
so it is inconclusive for runtime domain enforcement.

No live external messages, calendar writes, purchases, credential changes or
Production application deployment were performed in this functional audit.
