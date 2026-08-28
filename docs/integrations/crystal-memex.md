# Crystal + Memex native integration

## Audit

### Crystal

Crystal is MIT licensed and deprecated in favour of Nimbalyst. The useful concepts audited from the archive are parallel AI coding sessions, project/session dashboards, Git worktree isolation, diff review, terminal/session tracking, task queues and MCP permission bridging.

PalladiumAI already has Projects, GitHub integration, Agent Runtime/Harness, Tasks, Workflows, MCP, approvals and audit logging. The integration therefore adds only an Agent Workspaces coordination layer with optional `worktree` isolation metadata. It does not add a second Git client, terminal daemon, task queue, MCP server or agent runtime.

### Memex

Memex is GPL-3.0. No Memex source is copied into PalladiumAI. Only clean-room product concepts are transferred: typed timeline cards, durable cross-session context, tags, progress/events/metrics/insights and promotion of useful context into long-term knowledge.

PalladiumAI already has Memory, Knowledge/vector ingestion, Recall Notes, Files, agents and the model gateway. The integration therefore stores lightweight context timeline cards and promotes selected cards through the existing `ingestDocument` path. It does not add another vector database, memory engine, model-provider layer or companion-agent runtime.

## Native PalladiumAI capability

`/agent-workspaces` provides:

- parallel agent workspace plans;
- shared or Git-worktree isolation intent;
- branch/worktree labels without direct Git mutation;
- workspace lifecycle states;
- global or workspace-scoped context timeline cards;
- typed cards for notes, tasks, events, progress, metrics, links, people, places and insights;
- promotion of cards into the existing PalladiumAI Knowledge/vector layer;
- a bounded `agent_workspace` tool for agents to list/create workspaces and context cards.

The agent tool is registered through the existing local tool registry and therefore continues through `assertHarnessToolInput` and `tool_executions` auditing. It cannot execute shell commands, mutate Git, deploy, publish, access credentials or bypass existing approvals.
