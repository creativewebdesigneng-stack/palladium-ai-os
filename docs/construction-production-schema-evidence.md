# Construction & Industrial — production schema activation evidence

**Reconciled 2026-09-22 against active Supabase project `palladium-ai-os` (EU West).** This describes an actual database change, not a prediction about every construction task. No test project, asset, employee, customer or safety-critical industrial record was inserted into production.

## Preflight

- Checked the active project and migration history: no `public.construction_*` tables and no construction migration entries existed. The existing GitHub code already contained construction operations, planning, digital assets, inspections, specialist-agent governance and analytics; open PRs #582/#583/#588/#589/#592 are stale review items, **not** evidence that all their corresponding code is missing.
- Audited the seven existing, additive repository migrations, in dependency order, against already deployed database dependencies. No `DROP TABLE`, `TRUNCATE`, privileged new `SECURITY DEFINER` function or existing construction data replacement was involved. Each of the 24 defined tables appears in its migration's RLS/privilege setup loop.

## Production migrations applied

| Sequence | Existing repository migration | Applied Supabase migration name | Result |
| --- | --- | --- | --- |
| 1 | `20260915002500_construction_industrial_operations.sql` | `construction_industrial_operations` | Success |
| 2 | `20260915004000_construction_field_commercial_control.sql` | `construction_field_commercial_control` | Success |
| 3 | `20260915005000_construction_planning_estimating_workforce.sql` | `construction_planning_estimating_workforce` | Success |
| 4 | `20260915006000_construction_digital_asset_intelligence.sql` | `construction_digital_asset_intelligence` | Success |
| 5 | `20260915007000_construction_inspection_reliability_reports.sql` | `construction_inspection_reliability_reports` | Success |
| 6 | `20260915008000_construction_agent_governance.sql` | `construction_agent_governance` | Success |
| 7 | `20260915009000_construction_approval_index.sql` | `construction_approval_index` | Success |

Applied via the connected Supabase migration workflow. Supabase assigns its own applied-at versions; check the active migration history by **name**, not the timestamp in the repository filename. Do not replay the CREATE TABLE SQL or duplicate these migrations on this database.

## Verified after activation

- `24/24` public `construction_*` tables are present, have RLS enabled and have at least four owner-scoped CRUD policies each.
- `0/24` grant anonymous SELECT. `24/24` allow authenticated SELECT subject to RLS. The audit checked grants and RLS separately.
- All seven migration names appear in the active production migration history.
- Repository Construction API modules reference the expected table families. The public `/construction-industrial-hub` route responds with HTTP 200, but this unauthenticated page response does **not** establish signed-in CRUD, live industry data or safe engineering advice.
- Supabase Security Advisor reported no construction-table findings immediately after applying these migrations. Other existing project-wide warnings are tracked separately.

## Relational hardening verified in the live database (22 September 2026)

- Source PR [#666](https://github.com/creativewebdesigneng-stack/palladium-ai-os/pull/666), merged `69ba9ee8` with exact-head and merged Backend Checks green. Vercel production `dpl_NFg8fdXcoqgYHXAdoZqp3xjUfvvQ` reached READY on the same commit. The `construction_relational_owner_scope` migration was applied once, recorded in active Supabase migration history as `20260922220822`.
- Independently queried the PostgreSQL catalogs: **52/52** new deferred owner/workspace foreign keys validated, **8** parent unique indexes, **24** owner and **27** parent covering indexes, with **24/24** Construction tables retaining RLS. All 24 tables had no rows at preflight; no production user data was fabricated for verification.
- The post-migration performance advisor reported 25 *new* composite FKs without covering indexes. PR [#667](https://github.com/creativewebdesigneng-stack/palladium-ai-os/pull/667) merged `ab1feab0` after CI/preview and was READY in production as `dpl_GPaHCv3oK5Xhb22cXJGmh6b3gHYM`. Its `construction_composite_fk_indexes` migration was applied once and recorded as `20260922221544`.
- Final catalog counts: 52 validated deferred scope FKs; 8 parent unique indexes; 24 owner indexes; 27 original scoped indexes; **25 new composite indexes**; RLS remains enabled on all 24 Construction tables. Supabase's latest Performance Advisor reported **zero unindexed Construction FKs**, and its Security Advisor reported **zero Construction-specific findings**. These are database-control findings, not an authenticated end-to-end operational or competent-person certification.

## Still on the engineering list, not owner verification

- **Relational/index schema remediation complete:** the live Supabase Performance Advisor reports zero unindexed Construction foreign keys after both migrations. Keep the new supporting indexes while real usage patterns are established; an unused-index notice on empty new tables is not grounds to delete mandatory FK coverage. [Advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
- **Parent owner/workspace consistency is now enforced in SQL:** 52 deferred, validated composite FKs cover all inventoried Construction parent links alongside the original deletion actions. This is structural enforcement, not proof that authenticated user-level workflows or physical-site actions have passed acceptance.
- Run permitted signed-in create/read/update/delete tests of construction workspaces, projects, planning, digital assets, inspections, specialist-agent proposals and portfolio analytics using real authorised owner records or an isolated engineering test account. Check project/workspace mismatches and approval-required safety-critical actions.
- Verify that no agent can claim a physical inspection, engineering sign-off, connected sensor state, customer notice or site action without verified evidence and the appropriate competent-person approval.

The only owner-only tasks are separately listed under **U12** (qualified professional, actual industrial device/site data or requested real-world acceptance). Missing SQL tables, CI, indexes, permission flaws and ordinary API verification remain engineering's responsibility. **E12 is not 100% operational merely because the database now has its tables.**
