/** Static result contract for real browser-worker smoke tests.
 * Validate browser output, not an English phrase from a changeable third-party page.
 * This helper never fabricates navigation or browser extraction evidence.
 */
export const SMOKE_TARGET = "https://httpbingo.org/html";

export function verifySmokeEvidence(navigation, extraction, expectedUrl = SMOKE_TARGET) {
  if (navigation?.httpStatus !== 200 || navigation?.body?.ok !== true) {
    throw new Error("Chromium navigation RPC did not succeed.");
  }
  const page = navigation.body.data;
  const expected = new URL(expectedUrl);
  let actual;
  try { actual = new URL(page?.url); }
  catch { throw new Error("Chromium did not report a valid destination URL."); }
  if (actual.origin !== expected.origin || actual.pathname !== expected.pathname ||
      actual.search || actual.hash) {
    throw new Error("Chromium did not navigate to the exact approved test page.");
  }
  if (page?.status !== 200) {
    throw new Error("The actual test page did not return HTTP 200.");
  }
  if (extraction?.httpStatus !== 200 || extraction?.body?.ok !== true) {
    throw new Error("Chromium extraction RPC did not succeed.");
  }
  const text = extraction.body.data?.text;
  if (typeof text !== "string" || text.trim().length < 100) {
    throw new Error("The real page extraction was empty or insufficient.");
  }
  return { url: actual.toString(), characters: text.trim().length, pageStatus: page.status };
}
