# Pending audited recovery repair

This change is intentionally a draft and must not merge or deploy yet.
The connected Supabase apply_migration request for
close_unrecoverable_agent_tasks returned Invalid or expired requestState twice
on 17 October 2026. A subsequent read-only to_regprocedure check confirmed that
the function was absent. No direct SQL mutation or alternate credential was
used to bypass that failure.

The SQL candidate is stored outside migrations until normal authenticated
migration application succeeds. Then move it to the actual recorded migration
version, run the tests, check advisors, deploy through normal reviewed CI,
and verify the existing scheduled worker receipts and audit rows. Never invoke
the closure from an operator SQL session to manufacture a successful receipt.

The service-role-only SECURITY INVOKER function locks a bounded batch, preserves
ownership, requires an audit in the same transaction, protects approvals and
live leases, and never replays external actions. Only queued/running tasks older
than 15 minutes with no safe supported checkpoint, exhausted resume attempts or
requested cancellation qualify. A safe resumable checkpoint remains with the
existing resume worker. Terminal history and checkpoint data remain intact.

Production eligibility was three old QA tasks, all without checkpoints:
9e7fe1b7-6447-4583-8076-b588c185ff42,
dbfc71f6-7b13-4f84-a99f-e31822e3899e,
955f8a18-f0a4-45cf-85bf-5b0572943c83.
They must not be reported repaired until the scheduled worker closes them and
the owner-bound audit receipts are verified.

Validation before packaging: 2,868 application tests / 648 files;
1,576 isolated PostgreSQL authorization checks / 15 suites; browser worker 26;
Python safety 8. Recovery-specific coverage checks bounded/idempotent closure,
role denial, audit rollback, owner match, supported safe checkpoints, approval
pauses, freshness, leases, cancellation and exhausted retries.
