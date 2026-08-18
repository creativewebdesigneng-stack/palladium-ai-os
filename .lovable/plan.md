# Plan: Add SERPAPI_API_KEY to Published Server Runtime

## Goal
Make `SERPAPI_API_KEY` available to the published PalladiumAI server runtime so `src/lib/shopping/google-shopping.server.ts` can reach SerpApi, without exposing the key value in any code, logs, or UI.

## Mechanism for adding the secret

1. **Open Project Settings → Secrets** in the Lovable editor for the PalladiumAI project.
2. **Add a new Runtime secret** (not a Build secret):
   - Name: `SERPAPI_API_KEY`
   - Value: the SerpApi API key obtained from the SerpApi dashboard.
3. **Save the secret.** Lovable stores it in the project-level secret manager and injects it into server function handlers at runtime.
4. **Why this works:** `src/lib/shopping/google-shopping.server.ts` reads the value inside its handler with `process.env['SERPAPI_API_KEY']`, which is the canonical pattern for Lovable Cloud/TanStack Start server-only secrets. The value is never bundled into the browser bundle because it is read only inside a server function module.

## Redeploy / re-publish requirement

- **Yes, a re-publish is required.** Lovable Cloud runtime secrets are injected into the serverless environment at deploy time; adding or changing a secret does not automatically roll out to the currently live published deployment.
- After saving the secret in Project Settings, trigger a fresh publish from the Lovable editor. The new deployment will then include `SERPAPI_API_KEY` in its server function runtime environment.
- The preview environment will also pick up the secret on its next build, but the published production URL only updates after a successful publish.

## Verification without exposing the value

Use one of these read-only, non-exposing approaches:

1. **Code-level readiness check:** `googleShoppingConfigured()` in `src/lib/shopping/google-shopping.server.ts` returns `Boolean(process.env['SERPAPI_API_KEY']?.trim())`. A server function can call this and return only `{ configured: true/false }` — never the key itself.
2. **Functional smoke test:** Trigger a live `searchGoogleShopping({ query: "test" })` call from the published server and return only:
   - `success: true/false`
   - HTTP status or error category (e.g., `serpapi_unauthorized`, `network_error`, `empty_results`)
   - count of normalized offers
   No raw SerpApi response or key is returned.
3. **Browser UI check:** In the published app, attempt a shopping search in the Shopping/Explorer module. If results load from Google Shopping, the key is present and valid. If it silently falls back to Playwright/browser fallback, the key is missing or invalid.

## Recommended verification steps

1. Add `SERPAPI_API_KEY` in Project Settings → Secrets.
2. Publish the project from the Lovable editor.
3. After publish completes, run a server-side smoke test that calls `searchGoogleShopping` with a trivial query and returns only the boolean/result-count summary.
4. Confirm the response shows real Google Shopping offers (or a clear non-sensitive error category if the key is invalid) rather than an empty fallback.

## Out of scope for this plan

- No code changes, schema changes, or migrations.
- No changes to existing secrets, provider routing, or model settings.
- The key value itself will not be requested, shown, or logged.
