import type {
  BrowserAgentConfig,
  BrowserPageState,
  BrowserProductOffer,
  BrowserStep,
  BrowserTool,
  CheckoutDraft,
} from "@/lib/mission/browser-agent";
import { isDomainAllowed, resolveBrowserProvider } from "@/lib/mission/browser-agent";
import type { BrowserStorageState } from "./browser-storage-state";

function remoteConfig(provider: string) {
  if (provider === "playwright") {
    const endpoint = process.env["PLAYWRIGHT_BROWSER_ENDPOINT"];
    if (!endpoint) return null;
    const token = process.env["PLAYWRIGHT_BROWSER_TOKEN"];
    return {
      id: provider,
      endpoint: endpoint.replace(/\/$/, ""),
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  }
  if (provider === "browserbase") {
    const endpoint = process.env["BROWSERBASE_RUNNER_ENDPOINT"];
    const key = process.env["BROWSERBASE_API_KEY"];
    const project = process.env["BROWSERBASE_PROJECT_ID"];
    if (!endpoint || !key || !project) return null;
    return {
      id: provider,
      endpoint: endpoint.replace(/\/$/, ""),
      headers: {
        "content-type": "application/json",
        "x-bb-api-key": key,
        "x-bb-project-id": project,
      },
    };
  }
  return null;
}

function assertAllowed(url: string, allowedDomains: string[]) {
  if (!isDomainAllowed(url, allowedDomains)) {
    throw new Error("Browser navigation is outside this agent's domain allow-list.");
  }
}

export type StatefulBrowserTool = BrowserTool & {
  exportStorageState(): Promise<BrowserStorageState>;
};

export function createStatefulBrowserTool(args: {
  config: BrowserAgentConfig;
  initialState?: BrowserStorageState | null;
}): StatefulBrowserTool {
  const provider = resolveBrowserProvider();
  const cfg = remoteConfig(provider);
  if (!cfg) {
    throw new Error("Persistent browser sessions require a configured production browser provider.");
  }
  const steps: BrowserStep[] = [];
  let sessionId: string | null = null;

  const record = (kind: BrowserStep["kind"], target: string, detail?: string) => {
    steps.push({ kind, target, at: new Date().toISOString(), simulated: false, ...(detail ? { detail } : {}) });
  };

  const ensureSession = async () => {
    if (sessionId) return;
    const created = await fetch(`${cfg.endpoint}/session`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify({
        allowedDomains: args.config.allowedDomains,
        ...(args.initialState ? { storageState: args.initialState } : {}),
      }),
    });
    if (!created.ok) throw new Error(`Browser provider could not open a persistent session (${created.status}).`);
    const body = await created.json() as { sessionId?: string };
    if (!body.sessionId) throw new Error("Browser provider did not return a session.");
    sessionId = body.sessionId;
  };

  const call = async (action: string, params: Record<string, unknown> = {}) => {
    await ensureSession();
    const response = await fetch(`${cfg.endpoint}/action`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify({ sessionId, action, params }),
    });
    const body = await response.json().catch(() => ({})) as { ok?: boolean; data?: unknown; error?: string };
    if (!response.ok || body.ok === false) throw new Error(body.error || `Browser action "${action}" failed (${response.status}).`);
    return body.data;
  };

  const tool: StatefulBrowserTool = {
    provider: cfg.id,
    kind: "production",
    steps: () => steps,
    async navigate(url) {
      assertAllowed(url, args.config.allowedDomains);
      record("navigate", url);
      const data = await call("navigate", { url }) as { url?: string } | undefined;
      const resolved = data?.url ?? url;
      assertAllowed(resolved, args.config.allowedDomains);
      return { ok: true, url: resolved, simulated: false };
    },
    async search() { throw new Error("Search is not available in persistent browser_task sessions."); },
    async click(selector) {
      record("click", selector);
      await call("click", { selector });
      return { ok: true, simulated: false };
    },
    async type(selector, value) {
      record("type", selector, `${value.length} chars`);
      await call("type", { selector, text: value });
      return { ok: true, simulated: false };
    },
    async scroll(direction, amount) {
      record("scroll", direction, String(amount ?? 1));
      await call("scroll", { direction, amount: amount ?? 1 });
      return { ok: true, simulated: false };
    },
    async extract(url, selector) {
      assertAllowed(url, args.config.allowedDomains);
      record("extract", url, selector);
      const data = await call("extract", { url, selector }) as { text?: string; items?: unknown[] } | undefined;
      return { url, text: data?.text ?? "", items: data?.items ?? [], simulated: false };
    },
    async screenshot() {
      record("screenshot", "current page");
      const data = await call("screenshot") as { dataUrl?: string } | undefined;
      return data?.dataUrl ? { ok: true, dataUrl: data.dataUrl, simulated: false } : { ok: false, simulated: false };
    },
    async back() {
      const data = await call("back") as BrowserPageState | undefined;
      const url = data?.url ?? "";
      if (url) assertAllowed(url, args.config.allowedDomains);
      record("back", url);
      return { url, ...(data?.title ? { title: data.title } : {}), simulated: false };
    },
    async forward() {
      const data = await call("forward") as BrowserPageState | undefined;
      const url = data?.url ?? "";
      if (url) assertAllowed(url, args.config.allowedDomains);
      record("forward", url);
      return { url, ...(data?.title ? { title: data.title } : {}), simulated: false };
    },
    async wait(ms) {
      record("wait", `${ms}ms`);
      await call("wait", { ms });
      return { ok: true };
    },
    async close() {
      if (!sessionId) return;
      try { await call("close"); } catch {}
      sessionId = null;
    },
    async read(url) {
      const result = await tool.extract(url);
      return { url: result.url, text: result.text, simulated: false };
    },
    async compare(offers: BrowserProductOffer[]) {
      return [...offers].sort((a, b) => b.rating - a.rating || a.price + a.deliveryCost - (b.price + b.deliveryCost));
    },
    async fillForm(url, fields) {
      assertAllowed(url, args.config.allowedDomains);
      await call("fill_form", { url, fields });
      return { ok: true };
    },
    async prepareCheckout(offer): Promise<CheckoutDraft> {
      assertAllowed(offer.url, args.config.allowedDomains);
      return {
        product: offer.product,
        seller: offer.seller,
        itemPrice: offer.price,
        deliveryCost: offer.deliveryCost,
        tax: 0,
        fees: 0,
        total: offer.price + offer.deliveryCost,
        currency: offer.currency,
        checkoutUrl: offer.url,
        paymentAuthorised: false,
        simulated: false,
      };
    },
    async exportStorageState() {
      const data = await call("storage_state") as BrowserStorageState | undefined;
      if (!data) return { cookies: [], origins: [] };
      return data;
    },
  };
  return tool;
}
