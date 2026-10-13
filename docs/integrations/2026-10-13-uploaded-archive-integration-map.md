# Uploaded archive compatibility map — 13 October 2026

The upload set was audited against the live Blackstar main branch. **Don't vendor entire repositories or claim third-party engines are connected simply because a ZIP was provided.** This checkpoint implements the 177 scientific reference catalogue and the Diagram Design guide import through Blackstar's **existing** authenticated `agent_skills` store.

| Uploaded archive | Contents and purpose | Existing Blackstar integration | This checkpoint | What remains before executable use |
| --- | --- | --- | --- | --- |
| scientific-agent-skills-main.zip | 177 science/research `SKILL.md` guides, often referencing separate Python/CLI packages and APIs | `agent_skills`, source scanner, progressive agent skill context, authorised tool runtime | Pinned catalogue + per-owner resumable scanner/import + preview on Skills page | Workspace owner clicks import and reviews/enables safe entries; Python packages, keys and external data services configured per skill; certify real jobs |
| diagram-design-main.zip | 1 `SKILL.md` describing 44 diagrams, templates, renderers and import/export examples | Skills Registry, Website/Design Studio, existing file/project storage | Pinned Diagram Design SKILL.md guide can be scanned/imported into existing registry as disabled guidance; scripts/HTML not copied or executed | Adapt signed-off guidance; install safe rendering/export sandbox, proof visual outputs, approval/quotas |
| agentmemory-main.zip | Separate REST/MCP memory server and 17 skill templates for memory actions | Blackstar Memory Fabric, search/retrieval, provenance, owner scope, MCP runtime | Architecture analysed; no duplicate persistent memory introduced | Optional adapter with explicit per-user tenancy, consent, encryption, export/delete and tests; no direct write to another user's memory |
| OpenViking-main.zip | AGPL-3.0 semantic context/virtual directories, SDK/server and ~50 sample/host SKILL.md files | Blackstar Knowledge, Memory Fabric and existing MCP connector | Deliberately **not** vendored: licence/tenancy review | AGPL obligations review, authenticated isolated server, per-user partition and deletion contracts, data residency |
| browser-use-main(2).zip | Python browser automation framework and 7 SKILL.md guides | Already has production Playwright browser worker, domain allowlist, approval policy, session ledgers | No competing browser runtime installed; existing browser remains authoritative | Optional Python browser-use provider behind existing worker contract with auth, SSRF protection, no checkout and acceptance tests |
| awesome-harness-engineering-main (1).zip | Extended agent design bibliography/implementation patterns (15 archive entries) | Agent orchestration, planning, eval, approvals, workflow and CI | Reviewed as reference | Identify individual recommendations not already implemented and benchmark before adoption |
| awesome-harness-engineering-main.zip | Compact harness best practices (12 archive entries) | Same existing Blackstar agent runtime | Reviewed as reference | Identify gaps and independent benchmarks |

## User-facing scientific integration

- Publisher repository pinned at `K-Dense-AI/scientific-agent-skills`, commit `a1043ef544e3a100c28e70a736b6cf32554d0677`, with **177 exact `SKILL.md` Git object hashes**. The uploaded scientific ZIP could not be reopened due to a damaged central directory; the pinned publisher tree is the explicitly labelled reproducible substitute, not a claim of byte-for-byte equivalence.
- `src/screens/Skills.jsx` displays the 177 entries and seven archive areas through `ArchiveScientificSkillsPanel`. Each skill can be inspected from the pinned publisher snapshot.
- The **Import all 177 for review** button uses small authenticated batches, Git-blob integrity verification and Blackstar's `prepareAgentSkillPackage`/security scanner before writing owner-scoped `agent_skills` records. Already-owned skills are not overwritten if names conflict.
- Every imported source initially stays disabled. Existing operator enable/disable UI, owner RLS, learned skills, approval and auditing remain authoritative. Full source guidance may contain shell/SDK instructions: importing a playbook installs **no binaries**, provides no new permissions and never runs its third-party commands.
- Agent context retrieval now scans up to 1,000 existing owner-scoped skills so the 160 pre-existing agent procedures plus 177 scientific entries are eligible for matching once individually enabled (but prompt context remains bounded to 12 index and 2 selected bodies).
- Imports may be skipped for oversize files, source hash mismatch, server/network errors, duplicate names or dangerous content. Skipped items are reported, not silently claimed complete.
- No data from uploaded archives is given write access or credentials merely by appearing in the catalogue.

## Implementation verification targets

1. Pinned 177-item count, unique IDs, valid object hashes and source allowlist tests.
2. Source byte integrity and safe bounded fetch; bad/oversized sources rejected.
3. Source guide is packaged with `requires_tools=[]`, `requires_scripts=[]`, and `enabled=false`; existing security scanner applies.
4. Existing `agent_skills` user-ownership and permission controls are reused with audit records.
5. Full CI: production build, strict TS, JS tests, browser worker tests.
6. Production readiness is limited to an **available catalogue/importer** until the signed-in workspace owner initiates an import. No claim that all 177 have been installed on a user's account or executed on real science hardware.

## Separate work still required

- Diagram Design: **guide import is now available** from pinned publisher commit `0a8ea20ae69b33a5edce6018eedd3a9d26e90c1c`, checked against Git blob. Next: produce editable/vetted SVG/PNG exports through existing Design Studio; do not run arbitrary HTML/scripts in main application origin.
- OpenViking: AGPL legal review, verified per-user server tenancy and safe data syncing.
- AgentMemory: optional MCP/REST provider *only*, never an alternative unrestricted memory DB.
- Browser Use: optional Python adapter to existing browser-worker API, not a new permissions system.
- Harness collections: distinct improvements must demonstrate real benefit through benchmark evidence, not duplicate model/harness deployment.
