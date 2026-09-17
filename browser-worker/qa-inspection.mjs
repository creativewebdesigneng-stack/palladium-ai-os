const MAX_ERRORS = 25;
const MAX_ERROR_CHARS = 1200;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_CHARS);
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
    pushBounded(networkErrors, `${request.method()} ${request.url()} — ${request.failure()?.errorText || "request failed"}`);
  };
  const onResponse = (response) => {
    if (response.status() >= 400) pushBounded(httpErrors, `${response.status()} ${response.request().method()} ${response.url()}`);
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
      url: page.url(),
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
