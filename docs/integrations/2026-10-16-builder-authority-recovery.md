# Builder execution authority recovery

Restores the existing Builder job and deployment contracts, including plan, source, repository handoff, sandbox, repair, preview and production state. Both tables grant authenticated users owner-scoped SELECT only. No production jobs or deployments are created.

All 32 job/deployment mutation sites use the existing trusted server client; the 30 update queries retain explicit authenticated-owner filters. Caller RLS still establishes access for reads, preferences, connected repository selection and approval records. A rejected server credential never falls back to caller mutations. Planning, source generation, branch/file approvals, sandbox validation, repair acceptance and preview state transitions keep their existing conditional claims and receipts.

The deployment/job relationship includes the owner in its foreign key. A private invoker trigger requires generated, repository-applied and sandbox-passed source before preview insertion, and makes deployment/job/owner identity immutable. Approval, promoting and promoted transitions require an approved production action matching the exact owner, job, internal deployment, provider deployment, provider project and production target. There is no null-auth shortcut or new definer function. Later provider-state refreshes can preserve historical promotion evidence without falsely blocking current failure status.

Required audit entries precede sandbox execution, Vercel preview creation and production promotion. The existing application approval flow remains authoritative; migration does not manufacture approval records, execute source or create paid infrastructure.

Migration `20261016110511_restore_builder_execution_authority.sql` applied. Live verification confirms both tables have RLS, no authenticated insert/update grants, no anonymous reads, and zero jobs/deployments. Local production build and all 2,781 application tests pass; the focused Builder suite passes 49 tests, including owner/approval/audit negative paths. The isolated Postgres suite passes 52 checks. Full generated-route TypeScript validation passes.

Live AI generation, connected GitHub writes, E2B sandbox execution, Vercel previews and production promotion remain uncertified. No provider action is performed by these tests. The known deployed server credential issue still blocks required audit and trusted mutation paths; no workaround weakens that boundary.
