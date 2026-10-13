# Blackstar — seven third-party archives: compatibility and integration gate

**Audit date:** 2026-10-13. **Scope:** user-supplied ZIP snapshots, treated as untrusted source material.

This document records the integration contracts. A reference listed in the authenticated
Skills source library is **not** an installed, functioning or certified tool. The canonical
Blackstar Skills Registry, Mission Control, Memory Fabric, browser worker, MCP,
audit and approval systems remain authoritative; no parallel identity or job stack.

| Archive | Licence | Actual upstream function | Existing Blackstar destination | Readiness |
| --- | --- | --- | --- | --- |
| OpenViking | AGPL-3.0 | Hierarchical context database; knowledge, memories, skills, context retrieval and indexing | Existing Memory Fabric, Knowledge, owner-scoped MCP | Architecture linked; **licence and tenant isolation review required** before separate service |
| AgentMemory | Apache-2.0 | Persistent memory, hybrid recall, agent-specific history, consolidation and MCP tools | Memory Fabric and existing MCP Hub | Architecture linked; external service, API scope and health check required |
| Browser Use | MIT | Browser automation via Python browser agent / browser runtime | Existing BrowserTool and Playwright worker | Architecture linked; isolated worker and existing policy contract required |
| Scientific Agent Skills | MIT for repo; audit subdependencies | 177 individual research/scientific agent SKILL.md guides | Existing Skills Registry; Research, Health and Industry | 177 catalogued; each may be imported as **disabled scanned draft**, then certified |
| Diagram Design | MIT | Diagram creation, branded SVG/HTML, layout, import and exports | Skills Registry, Design Studio, Website Studio, Research | One skill catalogued; renderer/export dependencies unconfigured |
| Awesome Harness Engineering (extended) | CC0 1.0 | Agent harness engineering bibliography, architectures and templates | Agent Orchestrator, Workforce, Approval Centre, CI/evals | Reference only, not an executable engine |
| Awesome Harness Engineering (compact) | CC0 1.0 | Another collection of context, sandbox, verification and agent reliability references | General Intelligence Kernel, Observability, Certification | Reference only, not an executable engine |

## Source-aware skill import

`src/lib/runtime/agent-skills/external-source-catalog.ts` explicitly enumerates
177 scientific skill identifiers, plus Diagram Design, without duplicating Blackstar's
built-in 160-skill procedures.

`src/lib/runtime/agent-skills/external-source-catalog.functions.ts` implements
optional per-user review-draft import **only from allowlisted publisher/commit/path**
and reuses `prepareAgentSkillPackage`, `agent_skills` owner RLS and `writeAudit`.
No script file or dependency is copied or executed. Imported records are
`enabled=false`, carry an intentionally missing certification tool dependency,
and cannot be used as executable skills without subsequent verification.
The server prevents overwriting owner-created skill names.

The third-party `SKILL.md` content is untrusted **even when it comes from an
allowlisted repository**. Continue to apply Blackstar skill scanning, scoped
tool permissions, and the approval system to any subsequent activation. This
import path is **not** an automated security certification of all 177 sources.

## Runtime service decisions

### OpenViking

Do not embed upstream AGPL source directly into Blackstar's proprietary runtime.
Before any service is deployed, review AGPL source disclosure obligations for
network users, subcomponent licences, data ownership, tenant isolation, deletion,
backups, retention and embeddings/indexing cost. An independent governed connector
should not write or read user memories without Blackstar's Memory Fabric authority.

### AgentMemory

An externally installed AgentMemory instance may be exposed via a compatible
MCP endpoint and added through Blackstar's existing MCP Hub. Configure owner
identity, tool allowlist and approval flags in the existing
`external_mcp_servers` table. Existence of a saved endpoint is *not* service
health, authorised reading, or a working integration. Do not copy memory rows
between stores without explicit provenance, user scoping and reconciliation.

### Browser Use

Do not expose Browser Use's unrestricted Python browser agent to the model directly.
If a worker is added, it must implement Blackstar's existing
`src/lib/mission/browser-agent.ts` provider contract, domain and DNS allowlists,
browser sessions, timeouts, safety audit, and approval-before-write/payment boundaries.
Never allow automatic payments. Never interpret local simulation as real browsing.
The current bundled Playwright worker is separate from Browser Use.

### Scientific Agent Skills

Each one is an instruction set, often requiring distinct Python libraries, data
licences, model weights or paid provider credentials. Medical support, treatment
plans, pathogen surveillance and lab automation have higher safety controls.
An imported draft is NOT independently executable. Test representative tasks
and tool outputs with appropriate credentials before enabling. Use existing
Skills Registry tooling; never create a second registry.

### Diagram Design

Use the existing Skills Registry to review the guide. Actual visual production
must be wired to Design Studio/Website Studio's approved HTML/SVG renderer,
protecting against untrusted HTML, JavaScript and external downloads.
Branding/style profiles are configuration, not an API authorisation.

### Harness collections

They are **curated lists**, not agent tools. Consume templates/checklists into
Blackstar's existing planner, approvals, observability and evaluation workflows
after human review. Linked projects have independent licences, terms and
costs; don't recursively install them as part of this integration.

## Evidence required for “operational”

1. Source licence and subdependency checks; explicit provider account consent.
2. Per-user scope and permission tests; read and write isolation.
3. Health probe proves the actual service is reachable (not simply env configured).
4. Execution tests produce actual persisted output with no mocks.
5. Auditable approval for any external side effects or financial transactions.
6. Agent-runtime certification for each source capability; record dependency
   blockers instead of promising features that need paid APIs or unavailable compute.

## ZIP audit limitation

The scientific ZIP initially yielded 177 SKILL.md identifiers, but subsequent
reads found its central directory missing/truncated; 159 manifests were recovered
from local file headers, and later descriptions were cross-checked against a
public source. This is documented in the privately delivered full audit report.
Do not claim the full third-party source tree was installed from that archive.
