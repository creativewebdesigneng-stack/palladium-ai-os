# Customer operations schema recovery

Thirteen existing CRM/support/WhatsApp tables were absent from production: CRM contacts, activities, field definitions and saved views; support inboxes, tickets, messages, canned responses and help articles; WhatsApp conversations, messages, broadcasts and recipients. The recovery reuses their original migration contracts and later customisation columns, indexes and update triggers. It excludes unrelated 3D/tool registration changes from the original combined migrations.

## Authorization and relational integrity

All tables have RLS, explicit authenticated operations and no anonymous or authenticated TRUNCATE privileges. Reads remain owner-scoped, including users who share an organisation. Non-null CRM contact/support ticket organisation writes require current membership. Activity and support message UPDATE remains denied, preserving their original operation boundary. Ownership transfer is rejected on mutable tables.

Child writes verify owned contacts, inboxes, tickets, conversations, broadcasts and assigned agents. Reply messages use a composite owner/conversation foreign key instead of recursive self-referencing RLS. Deletion clears only the reply pointer, preserving the surviving message's owner and conversation. Owner foreign keys with cascading deletion close retention gaps in original owner-default tables. Covering indexes are retained or added for foreign-key and owner access paths. No public SECURITY DEFINER helper or retired public authorization function is introduced.

The recovery refuses partial existing state. It seeds no contact, message, campaign, inbox, provider credential, enabled tool or approval and sends nothing externally. WhatsApp delivery still requires existing governed integration actions and valid provider authorization; database draft/status rows are not delivery evidence. Organisation-wide sharing is not implicitly granted by this recovery.

## Production verification

Supabase recorded migration version `20261015215858`; the file is aligned with that version. Live checks confirmed thirteen RLS tables, fifty policies, no anonymous SELECT, no authenticated TRUNCATE, no UPDATE policy without both USING/WITH CHECK, and the exact reply-boundary foreign key. Security advisor findings are unchanged. Performance advisors report only unused-index information; required support/foreign-key indexes are retained.

## Tests

`npm run test:customer-recovery` passed 239 real isolated Postgres checks, added to Backend Check CI. Tests cover positive owner creation, shared-organisation isolation, cross-owner parent linkage, reply boundaries, deletion semantics, retention cleanup and preservation of another user's data. Connector/browser reapplication checks were also tightened to execute the complete migration and assert its specific preflight refusal, avoiding an unrelated prepared-statement rejection.

Build, TypeScript and the 2,647-test application suite passed locally. Exact CI and production deployment are recorded in the PR. No UI sign-in or external delivery is certified by isolated SQL tests. The inventory now contains 59 remaining literal-reference candidates and one additional missing economy-account dependency; dynamic references and missing columns remain incompletely inventoried. The production server credential, real browser provider and post-deployment scheduled compliance verification remain separate blockers.
