const MAX_STATE_BYTES = 256 * 1024;
const MAX_COOKIES = 200;
const MAX_ORIGINS = 50;
const MAX_LOCAL_STORAGE_PER_ORIGIN = 200;
const MAX_VALUE_CHARS = 16_000;

function normalizeDomain(value) {
  return String(value || "").trim().toLowerCase().replace(/^\./, "").replace(/^www\./, "");
}

function allowedHost(host, allowedDomains) {
  const normalized = normalizeDomain(host);
  return allowedDomains.some((entry) => {
    const allowed = normalizeDomain(entry);
    return normalized === allowed || normalized.endsWith(`.${allowed}`);
  });
}

function text(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function filterStorageState(value, allowedDomains) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const cookies = [];
  for (const item of (Array.isArray(input.cookies) ? input.cookies : []).slice(0, MAX_COOKIES)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const domain = normalizeDomain(text(item.domain, 253));
    const name = text(item.name, 500);
    if (!domain || !name || !allowedHost(domain, allowedDomains)) continue;
    cookies.push({
      name,
      value: text(item.value, MAX_VALUE_CHARS),
      domain: text(item.domain, 253) || domain,
      path: text(item.path, 1000) || "/",
      expires: Number.isFinite(Number(item.expires)) ? Number(item.expires) : -1,
      httpOnly: item.httpOnly === true,
      secure: item.secure === true,
      sameSite: item.sameSite === "Strict" || item.sameSite === "None" ? item.sameSite : "Lax",
    });
  }

  const origins = [];
  for (const item of (Array.isArray(input.origins) ? input.origins : []).slice(0, MAX_ORIGINS)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    let parsed;
    try { parsed = new URL(text(item.origin, 2000)); } catch { continue; }
    if (!/^https?:$/.test(parsed.protocol) || !allowedHost(parsed.hostname, allowedDomains)) continue;
    const localStorage = (Array.isArray(item.localStorage) ? item.localStorage : [])
      .slice(0, MAX_LOCAL_STORAGE_PER_ORIGIN)
      .flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
        const name = text(entry.name, 1000);
        if (!name) return [];
        return [{ name, value: text(entry.value, MAX_VALUE_CHARS) }];
      });
    origins.push({ origin: parsed.origin, localStorage });
  }

  const state = { cookies, origins };
  if (Buffer.byteLength(JSON.stringify(state), "utf8") > MAX_STATE_BYTES) {
    throw new Error("Browser session state exceeds the 256 KB persistence limit.");
  }
  return state;
}
