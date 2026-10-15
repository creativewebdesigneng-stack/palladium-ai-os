# Content workspace recovery — 15 October 2026

Restores eleven missing contracts used by existing authenticated handlers: saved prompts, immutable versions and run history; smart tables, records and views; Zen Notes and HTML documents; SEO projects and observations; task focus sessions. The migration uses existing repository table definitions and restores only these contracts. It does not replay the old SEO tool-catalogue activation.

Production migration `20261015222030_restore_content_workspace.sql` is applied to `piwhiuangitqvwvwwcga`. Verification found eleven tables with RLS and 41 policies, zero anonymous SELECT privileges and zero authenticated TRUNCATE privileges. Prompt versions retain SELECT/INSERT only; prompt runs retain SELECT/INSERT/UPDATE only. No existing records, capability grants or provider connections were created.

Writes require the authenticated owner and validate linked prompt, table, note, knowledge document, SEO project or task ownership. Non-null organisation writes also require current membership. User deletion cascades private workspace data; parent prompt deletion removes immutable snapshots while retaining detached run history; note deletion preserves HTML with a null source. Foreign-key indexes cover these relationships. Focus task source/id must be supplied together, and a partial unique index prevents two active sessions for one owner.

The application now reports smart-table record/view read failures, default-view creation failures, active-focus-session read failures and failed note-to-knowledge linking. Previously these could appear as empty data or successful operations. Initial table creation and knowledge ingestion remain separate requests: a later link/view failure is now reported, but does not roll back the already-created table/document.

Verification: 190 isolated real PostgreSQL checks cover owner operations, same-organisation cross-owner isolation, parent ownership, immutable versions, operation grants, task-pair validation, active-session uniqueness, deletion semantics and conservative defaults. Eleven new application tests cover database error paths and their successful counterparts. Production performance advisors show only unused-index informational notices; security advisories remain the four previously reviewed marketplace RPC warnings, paid-plan leaked-password-protection setting, and five intentionally server-only RLS tables without client policies.

The 22:17 UTC scheduled compliance sync also completed successfully after the duplicate-version fix: all three runs succeeded with no errors; two created one version/change each and the third reused existing content with zero new versions/changes. Scheduler authentication was preserved.

The production build and TypeScript check passed, as did all 2,676 application tests across 632 files. The 190-check database suite is included in CI.

The static inventory now contains 35 unreviewed absent literal table-reference names and the additional agent-economy-account dependency. Dynamic table references, missing columns, external-provider deployment and the privileged audit credential remain separate verification work. This is not a claim that every UI workflow is operational.
