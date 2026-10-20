# Vercel deployment budget and gated Preview policy — 20 October 2026

## Problem
Blackstar's Hobby Vercel project exhausted its daily deployment request allowance after many incremental pushes to feature and repair branches. This blocked a Production build even after the code passed full backend CI, merged into `main` and passed an exact-head Preview.

The official Vercel docs distinguish **Ignored Build Step** (which still counts toward deployment limits) from **git.deploymentEnabled** (prevents Git pushes on selected branches from automatically triggering deployments). Avoid using `ignoreCommand` as a fix for the 402 daily deployment cap.

## Minimal configuration
The existing `vercel.json` keeps the original protections for internal and Dependabot branches. It now explicitly enables automatic deployment for `main` while disabling **automatic** Git-triggered Preview builds for `feature/**`, `repair/**` and `ops/**`. Other branches (including staging and release branches) retain Vercel's default Git behaviour.

This prevents repeated automatic Preview requests after every minor incremental commit. It **does not** disable GitHub CI or block manually requested Preview builds, and it does not remove Vercel build limits or bypass billing.

## Release workflow (mandatory)
1. Work on a feature/repair/ops branch; GitHub Backend Check still runs on pull requests and protects the existing app, database access and browser worker.
2. After the branch passes all checks, request **one explicit Vercel Preview build** from the exact Git SHA. Confirm the Vercel deployment is `READY`, and its actual commit metadata matches the approved PR head.
3. If code changes after Preview, repeat CI and run another explicit Preview against the **new exact SHA**. A prior commit's READY Preview must not be represented as the new head.
4. Review the PR and merge only after both exact-commit checks pass. Keep Production deployments automatic on `main`.
5. Verify a **distinct Production-target** Vercel deployment at the exact merge commit and verify the live `palladium-ai-os.vercel.app` alias. Never promote a Preview to Production when Preview and Production secrets, providers or worker URLs differ.
6. If Vercel returns HTTP 402 `api-deployments-free-per-day`, **stop creating retry deployments**. Keep the PR open until a new deployment can be requested under the plan. Do not claim a GitHub merge is a successful Production deployment.

## Rollout notes
- This policy changes default Preview behaviour: for the named branch patterns, **Previews must now be requested manually**, with GitHub CI first. Teams depending on auto-Previews must explicitly accept this trade-off.
- Vercel's Minimatch branch patterns are used in the existing `git.deploymentEnabled` config. `main` remains `true`; the update intentionally does not set `git.deploymentEnabled=false` globally.
- Changes under `ops/**` (including this policy's PR) also require manual Preview creation when required. Do not attempt to bypass daily limits.
- The current merge commit `726743dbde3b1ab744c226983430d014577cedf1` has already been merged into `main` but the Production deployment remains unverified; this policy does not repair that retrospectively. Once Vercel allows new builds, deploy and verify that commit or the then-current `main` commit with Production settings.

## References
- https://vercel.com/docs/project-configuration/git-configuration
- https://vercel.com/docs/monorepos#ignoring-the-build-step
- https://vercel.com/docs/builds
