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

## Relational integrity and index hardening — separate follow-up

The next additive migration `20260922001000_construction_relational_owner_scope.sql` is designed to close two **engineering-owned** schema gaps found in the active database: (a) single-column parent foreign keys permit a child row to reference an owned record in a different workspace or another owner's workspace, and (b) the Performance Advisor identified 51 unindexed construction foreign keys, consisting of 24 `user_id` FKs plus 27 construction-to-construction FKs.

This migration proposes 8 scoped unique parent indexes, 52 additional composite, deferred owner/workspace FKs, and 51 missing child covering indexes. It retains the original deletion constraints and all current RLS/privileges. A separate rolled-back temporary-table check established that deferred composite references coexist with original `ON DELETE CASCADE` and `ON DELETE SET NULL` behaviours. **A proposed SQL file or green CI does not establish that the production migration has been applied**; record exact production migration status and subsequent catalog/advisor results separately after execution.

## Still on the engineering list, not owner verification

- Supabase Performance Advisor identified **51 unindexed construction foreign keys**. Indexing is an additive engineering optimisation to design, test and review against actual query patterns; do not remove fresh indexes merely because unused-index lints appear on an empty new schema. [Advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
- Audit cross-table relational owner/workspace/parent consistency beyond top-level `user_id` RLS; a foreign key alone may not prove that a referenced workspace/project belongs to the same owner. Strengthen the established schema where required before calling multi-tenant write paths certified.
- Run permitted signed-in create/read/update/delete tests of construction workspaces, projects, planning, digital assets, inspections, specialist-agent proposals and portfolio analytics using real authorised owner records or an isolated engineering test account. Check project/workspace mismatches and approval-required safety-critical actions.
- Verify that no agent can claim a physical inspection, engineering sign-off, connected sensor state, customer notice or site action without verified evidence and the appropriate competent-person approval.

The only owner-only tasks are separately listed under **U12** (qualified professional, actual industrial device/site data or requested real-world acceptance). Missing SQL tables, CI, indexes, permission flaws and ordinary API verification remain engineering's responsibility. **E12 is not 100% operational merely because the database now has its tables.**
