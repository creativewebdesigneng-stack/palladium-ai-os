const MAX_ERRORS = 25;
const MAX_ERROR_CHARS = 1200;

/** Read-only QA errors may include bearer tokens, signed URLs or credentials.
 * Never send those raw values back to an agent or the Visual Operator.
 */
export function redactQaSecrets(value) {
  return String(value || "")
    .replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => {
      try {
        const url = new URL(candidate);
        if (url.username || url.password) return "[redacted-url]";
        url.search = "";
        url.hash = "";
        if (/\/(?:oauth|auth\/callback|reset-password|magic-link|invite|verify-email)(?:\/|$)/i.test(url.pathname)) return url.origin;
        return url.toString();
      } catch { return "[redacted-url]"; }
    })
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{6,}/gi, "Bearer [redacted]")
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?token|password|client[_-]?secret|authorization)\s*[:=]\s*["']?[^\s,"'};]+/gi, "$1=[redacted]");
}
function clean(value) {
  return redactQaSecrets(value).replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_CHARS);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    url.search = "";
    url.hash = "";
    return clean(url.toString());
  } catch {
    return clean(value);
  }
}

function pushBounded(list, value) {
  const message = clean(value);
  if (message && list.length < MAX_ERRORS && !list.includes(message)) list.push(message);
}

export async function inspectPageReadOnly(page, navigate, params = {}) {
  const consoleErrors = [];
  const pageErrors = [];
  const networkErrors = [];
  const httpErrors = [];

  const onConsole = (message) => {
    if (message.type() === "error") pushBounded(consoleErrors, message.text());
  };
  const onPageError = (error) => pushBounded(pageErrors, error?.message || error);
  const onRequestFailed = (request) => {
    pushBounded(networkErrors, `${request.method()} ${safeUrl(request.url())} — ${request.failure()?.errorText || "request failed"}`);
  };
  const onResponse = (response) => {
    if (response.status() >= 400) pushBounded(httpErrors, `${response.status()} ${response.request().method()} ${safeUrl(response.url())}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  try {
    const navigation = await navigate(params);
    await page.waitForTimeout(Math.max(0, Math.min(5000, Number(params.settleMs ?? 750)))).catch(() => {});
    const bytes = await page.screenshot({ type: "png", fullPage: Boolean(params.fullPage) });
    return {
      url: safeUrl(page.url()),
      title: await page.title(),
      status: navigation?.status ?? null,
      screenshotDataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
      consoleErrors,
      pageErrors,
      networkErrors,
      httpErrors,
      checkedAt: new Date().toISOString(),
      readOnly: true,
    };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  }
}
