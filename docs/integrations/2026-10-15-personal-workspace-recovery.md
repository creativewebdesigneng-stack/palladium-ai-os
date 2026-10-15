# Personal workspace and shopping recovery

Thirteen existing table contracts were absent: shopping tasks/results, purchase requests, product watches, shopping lists/items, spend limits, Personal OS profiles, fitness profiles/workouts/weight entries, finance transactions and marketing campaigns. Recovery reuses their original fields, enum dependency, indexes, update triggers and purchase quantity extension. It seeds no profile, capability, budget, purchase, campaign, health record or paid operation.

All tables have RLS, explicit privileges, no anonymous access and no authenticated TRUNCATE. Child writes require owned agents, personal tasks, approvals, lists and shopping results. A result/task pair must agree when both are supplied. Parent-derived shopping-result access remains owner-scoped. Non-null finance/marketing organisation writes require membership. Owner-deletion cascades include fitness records; Personal OS keeps its original no-DELETE client privilege. Purchase status defaults to awaiting approval. Personal OS defaults retain zero spend, empty capabilities and all three approval requirements.

## Spend-control failures

Failed limit, owned-agent, purchase-history or approval reads now stop monetary preparation instead of being interpreted as empty data. Missing owned agents are rejected. Non-finite/negative amounts, ceilings and spent totals fail closed. Production preparation, approval and checkout call sites now pass the actual currency into the existing limit gate. Controls and committed history with incompatible currencies are not compared without verified conversion. This is a denial boundary, not a new FX service; mixed-currency preparation needs compatible verified controls. Existing valid same-currency limits remain supported. No payment execution capability is added.

## Verification

Build, TypeScript and all 2,665 application tests passed (631 files), including 18 added spend-limit cases. `npm run test:personal-recovery` passed 217 isolated real Postgres checks covering positive owner writes, cross-owner parent references, shared-org isolation, defaults and deletion cleanup; added to CI.

Production recorded migration `20261015220913`; filename matches actual history. Live verification found thirteen RLS tables, 51 policies, no anonymous SELECT/client TRUNCATE, no client Personal OS DELETE, and awaiting-approval purchase default. Performance advisors report only unused-index information. No UI sign-in, real checkout or provider execution is certified by these checks. Exact CI/deployment evidence is recorded in the PR.

The inventory now contains 46 remaining literal-reference candidates plus an additional economy-account dependency. Dynamic references, legacy route compatibility and missing columns need further review. The production audit credential, separately configured browser provider, paid leaked-password-protection feature and a fresh scheduled compliance run remain separate prerequisites.
