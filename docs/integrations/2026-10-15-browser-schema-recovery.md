# Browser runtime schema recovery

The wider production inventory found 77 literal `.from()` reference names absent from the public schema. `knowledge` is a verified existing private storage bucket, not a missing table. Four confirmed missing browser tables are recovered here; the remaining 72 names are recorded as review candidates in the adjacent JSON inventory. Dynamic references, missing columns, unused legacy paths and other storage buckets need separate review. The inventory does not certify the whole application or authorize creating every referenced name as a table.

## Existing contracts restored

The recovery reuses the original `browser_sessions`, `browser_credentials`, `browser_profiles` and `browser_artifacts` columns and indexes. Session provider remains explicit (no simulated default). User/session/profile writes are owner-scoped; profiles and sessions cannot reference another owner's agent, sessions cannot reference another owner's personal task, and non-null credential/profile organisation writes require current membership. Sharing an organisation grants no access to another owner's encrypted state or credential ciphertext. Existing authenticated server functions still mediate plaintext encryption/decryption; this migration does not create or expose plaintext secrets.

Anonymous privileges and authenticated TRUNCATE are revoked. Artifact metadata INSERT/UPDATE remain trusted-server-only, with owner read/delete. No profile, credential, session, artifact, worker, enabled tool, approval or browser grant is backfilled. The existing private knowledge bucket and owner path policies are unchanged. Existing server credential and production worker prerequisites remain required.

Production recorded version `20261015214836`; the repository filename matches. Live verification found all four RLS-protected tables, 14 policies, correct client privileges, zero records and no provider default. Security advisor findings are unchanged. The migration refuses partial existing state.

## Existing browser code repaired

- Browser Control now reports failed history reads instead of showing zero sessions/executions as if access succeeded.
- Downloads reject embedded credentials and redirects, use the same public-address/DNS guard as MCP, and cancel streamed bodies above 25 MB rather than allocating an unbounded response first. A caller signal no longer removes the 30-second timeout.
- The MCP address guard is moved unchanged to a shared server utility; existing MCP contracts and regression coverage remain. DNS validation still requires production egress filtering against connection-time rebinding. Redirecting downloads require a separately verified allowed link.

## Verification

Build, TypeScript and all 2,647 application tests passed across 631 files. Seventeen added application tests cover truthful history failure, public downloads, redirected/private/special-purpose targets and streamed size limits. `npm run test:browser-recovery` passed 68 isolated Postgres authorization checks, now part of CI. Existing MCP policy tests passed after guard reuse. No external credential was supplied, no browser provider was enabled and no live browser execution is certified by these checks. Exact CI and production deployment evidence are recorded in the PR.
