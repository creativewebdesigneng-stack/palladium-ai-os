# Blackstar dependency audit — follow-redirects credential handling

Date: 20 October 2026

## Why the release was blocked

GitHub Backend Check run 39490031074 failed its **High severity dependency audit**
before TypeScript/tests. Bun 1.3.14 reported two HIGH vulnerabilities in
`follow-redirects@1.16.0`, reached through
`@nangohq/frontend -> @nangohq/types -> axios -> follow-redirects`:

- GHSA-q3jh-wrc6-jgq8 — array-form request headers may bypass sensitive
  credential stripping during redirects.
- GHSA-8r9p-f939-6h3c — some `sensitiveHeaders` regular-expression metacharacters
  are not escaped, potentially forwarding credentials to cross-origin targets.

The patched release is **follow-redirects 1.16.1**. Do not disable audit, ignore
the advisories, or upgrade Nango/other providers speculatively as a workaround.

## Remediation

- Add the existing-root-package override `follow-redirects: 1.16.1` without
  modifying the Nango connector implementation or replacing any connector.
- Update the checked-in Bun text lockfile package record and integrity hash
  for `follow-redirects@1.16.1`. The npm-distributed SHA-512 integrity is
  `sha512-FNvFGzoMLWmE6Yj9spb/zjd7yiNCHiAW9/Tg9CXrQ8wuu32HtlJOwWO11OJafl5FfY3DxTdQ0vj42zU1kvv5jg==`.
- Leave the existing pinned `axios` dependency and other overrides unchanged.
- Keep `bun install --frozen-lockfile` and
  `bun audit --audit-level high` mandatory in GitHub Actions.

## Release gates

The branch requires successful frozen-lockfile install, fresh high-severity audit,
production build, strict TypeScript, unit/integration tests, and a SHA-matched Vercel
Preview before merge or Production release. It does not claim a live provider
call or authenticated browser-agent acceptance, and it does not change database,
credentials, or existing connector policy.
