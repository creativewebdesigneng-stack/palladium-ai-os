# HTML Anything + ZenNotes → PalladiumAI

## Source audits

### HTML Anything
- License: Apache-2.0.
- Useful concepts: arbitrary source → HTML artifacts, multiple deliverable surfaces, skill-driven generation, live preview, export, agent-assisted HTML authoring.
- Not copied as separate systems: local CLI agent detection, standalone Next.js runtime, separate template/agent store, separate deployment model.

### ZenNotes
- License: MIT.
- Useful concepts: keyboard-first Markdown notes, daily/weekly notes, tags, tasks, archive/trash, split editing/preview, promotion of durable notes into shared knowledge.
- Not copied as separate systems: Electron app, Go self-hosted server, separate vault watcher/search engine, standalone MCP server, filesystem-first sync model.

## Native PalladiumAI mapping

### Zen Notes
`zen_notes` is an editable working-note layer only. Finished notes are promoted with the existing `memory.server.ts::ingestDocument` path, which creates `memory_documents`, chunks, embeddings and knowledge memories used by the current agent retrieval system. PalladiumAI Files, Knowledge, Memory and MCP remain authoritative.

### HTML Studio
`html_studio_documents` stores standalone source + HTML artifacts. The `html_studio` agent tool lets explicitly granted PalladiumAI agents create/update these artifacts through the existing Harness and `tool_executions` audit wrapper. No separate coding-agent process detector or model runtime is introduced.

The operator preview uses a script-disabled sandbox. External deployment/publishing remains with PalladiumAI's existing Builder/deployment/integration systems.

## Deliberate exclusions
- no duplicate auth or user system
- no duplicate vector database/search implementation
- no duplicate MCP server
- no local CLI agent detector
- no Electron/Go sidecar runtimes
- no arbitrary generated HTML script execution with PalladiumAI session authority
- no second app/site deployment stack
