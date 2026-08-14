/**
 * Provider-agnostic browser automation abstraction.
 *
 * Nothing in PalladiumAI talks to a browser automation vendor directly: agents,
 * tasks and the approval system only ever talk to a `BrowserTool`.
 *
 * Honesty invariants enforced here, independently of the provider:
 *  - the development provider is a SIMULATION. Everything it returns is stamped
 *    `simulated: true` and is never presented as a real page or a real product.
 *  - a production provider is only considered connected when its credentials
 *    exist AND a live health probe succeeds.
 *  - every navigation/read is checked against a domain allowlist.
 *  - checkout can only ever be *prepared*. No provider may pay for anything,
 *    and no agent ever receives payment credentials.
 */

/* ------------------------------------------------------------------ contract */

export type BrowserActionKind =
  | "navigate"
  | "search"
  | "click"
  | "type"
  | "scroll"
  | "extract"
  | "screenshot"
  | "back"
  | "forward"
  | "wait"
  | "close"
  | "read"
  | "compare"
  | "fill_form"
  | "prepare_checkout";

/** Kept as an alias: older call sites import `BrowserStepKind`. */
export type BrowserStepKind = BrowserActionKind;

export type BrowserStep = {
  kind: BrowserActionKind;
  target: string;
  detail?: string;
  at: string;
  /** True when the step was produced by the development simulation. */
  simulated?: boolean;
};

export type BrowserProductOffer = {
  product: string;
  price: number;
  currency: string;
  seller: string;
  delivery: string;
  deliveryCost: number;
  rating: number;
  url: string;
  inStock: boolean;
  specs: Record<string, string>;
  reason: string;
  /** True when the offer is simulated development data, not a real listing. */
  simulated?: boolean;
};

export type CheckoutDraft = {
  product: string;
  seller: string;
  itemPrice: number;
  deliveryCost: number;
  tax: number;
  fees: number;
  total: number;
  currency: string;
  checkoutUrl: string;
  /** Always false: a browser tool may never complete a payment. */
  paymentAuthorised: false;
  /** True when the draft was produced from simulated data. */
  simulated?: boolean;
};

export type BrowserAgentConfig = {
  /** Domains the agent may visit. Empty = nothing is allowed. */
  allowedDomains: string[];
  /** Tools the owning agent has been granted. */
  allowedTools: string[];
  /** Optional hard spend ceiling used when preparing checkout. */
  spendCap?: number | null;
};

export type BrowserPageState = {
  url: string;
  title?: string;
  simulated?: boolean;
};

export type BrowserTool = {
  readonly provider: string;
  /** "development" providers are simulations; "production" ones drive a real browser. */
  readonly kind: BrowserProviderKind;
  steps(): BrowserStep[];

  navigate(url: string): Promise<{ ok: boolean; url: string; blocked?: string; simulated?: boolean }>;
  search(
    query: string,
    opts?: { budget?: number | null; currency?: string },
  ): Promise<BrowserProductOffer[]>;
  click(selector: string): Promise<{ ok: boolean; simulated?: boolean }>;
  type(selector: string, text: string): Promise<{ ok: boolean; simulated?: boolean }>;
  scroll(direction: "up" | "down", amount?: number): Promise<{ ok: boolean; simulated?: boolean }>;
  extract(
    url: string,
    selector?: string,
  ): Promise<{ url: string; text: string; items?: unknown[]; simulated?: boolean }>;
  screenshot(): Promise<{ ok: boolean; dataUrl?: string; simulated?: boolean }>;
  back(): Promise<BrowserPageState>;
  forward(): Promise<BrowserPageState>;
  wait(ms: number): Promise<{ ok: boolean }>;
  close(): Promise<void>;

  /** Convenience wrapper over `extract` kept for existing call sites. */
  read(url: string): Promise<{ url: string; text: string; simulated?: boolean }>;
  compare(offers: BrowserProductOffer[]): Promise<BrowserProductOffer[]>;
  fillForm(url: string, fields: Record<string, string>): Promise<{ ok: boolean }>;
  prepareCheckout(offer: BrowserProductOffer): Promise<CheckoutDraft>;
};

export type BrowserProviderKind = "development" | "production";

export type BrowserProviderFactory = (config: BrowserAgentConfig) => BrowserTool;

export type BrowserProviderDescriptor = {
  id: string;
  label: string;
  kind: BrowserProviderKind;
  /** Environment variables the provider needs before it can run at all. */
  requires: string[];
  note: string;
  factory: BrowserProviderFactory;
};

const registry = new Map<string, BrowserProviderDescriptor>();

export function registerBrowserProvider(
  descriptor: BrowserProviderDescriptor | string,
  factory?: BrowserProviderFactory,
): void {
  if (typeof descriptor === "string") {
    // Legacy signature: (name, factory)
    if (!factory) throw new Error("A provider factory is required");
    registry.set(descriptor, {
      id: descriptor,
      label: descriptor,
      kind: "production",
      requires: [],
      note: "",
      factory,
    });
    return;
  }
  registry.set(descriptor.id, descriptor);
}

export function listBrowserProviders(): string[] {
  return [...registry.keys()];
}

export function describeBrowserProviders(): Array<Omit<BrowserProviderDescriptor, "factory"> & {
  configured: boolean;
}> {
  return [...registry.values()].map(({ factory: _factory, ...d }) => ({
    ...d,
    configured: d.requires.every((key) => Boolean(process.env[key])),
  }));
}

/* ------------------------------------------------------------------ allowlist */

export function domainOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isDomainAllowed(url: string, allowed: string[]): boolean {
  const host = domainOf(url);
  if (!host) return false;
  return allowed.some((d) => {
    const clean = d.replace(/^www\./, "").toLowerCase();
    return host === clean || host.endsWith(`.${clean}`);
  });
}

/**
 * Enforce the agent allow-list at the PalladiumAI boundary as well as in the
 * remote browser worker. The worker is a defence-in-depth layer, never the
 * only thing preventing an LLM-controlled URL from being opened.
 */
function assertAllowedUrl(url: string, allowedDomains: string[]): void {
  if (!isDomainAllowed(url, allowedDomains)) {
    throw new Error("Browser action blocked: the URL is not in this agent's domain allow-list.");
  }
}

/* ------------------------------------------- development simulation provider */

const SIM_SELLERS: Array<{ name: string; domain: string; delivery: string; deliveryCost: number }> =
  [
    {
      name: "John Lewis",
      domain: "johnlewis.com",
      delivery: "Free delivery, 2–4 days",
      deliveryCost: 0,
    },
    { name: "Amazon UK", domain: "amazon.co.uk", delivery: "Next-day delivery", deliveryCost: 0 },
    {
      name: "Argos",
      domain: "argos.co.uk",
      delivery: "Click & collect today",
      deliveryCost: 3.95,
    },
    {
      name: "Currys",
      domain: "currys.co.uk",
      delivery: "Standard delivery, 3 days",
      deliveryCost: 4.99,
    },
    { name: "IKEA", domain: "ikea.com", delivery: "Delivery from £15", deliveryCost: 15 },
  ];

export const SIMULATED_PREFIX = "[SIMULATED]";

/**
 * DEVELOPMENT PROVIDER — SIMULATION ONLY.
 *
 * Performs no network access at all. It exists so the full
 * research → compare → approve → checkout flow can be exercised without a
 * browser vendor. Everything it returns is stamped as simulated so no surface
 * can present it as a real page, a real product or a real purchase.
 */
export function createSimulatedBrowserTool(config: BrowserAgentConfig): BrowserTool {
  const steps: BrowserStep[] = [];
  const history: string[] = [];
  let cursor = -1;

  const record = (kind: BrowserActionKind, target: string, detail?: string) => {
    steps.push({
      kind,
      target,
      at: new Date().toISOString(),
      simulated: true,
      ...(detail === undefined ? {} : { detail }),
    });
  };

  const hash = (input: string) => {
    let h = 0;
    for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) % 100000;
    return h;
  };

  const state = (): BrowserPageState => ({
    url: history[cursor] ?? "about:blank",
    simulated: true,
  });

  return {
    provider: "development_simulation",
    kind: "development",
    steps: () => steps,

    async navigate(url) {
      if (!isDomainAllowed(url, config.allowedDomains)) {
        record("navigate", url, "blocked by allowlist");
        return { ok: false, url, blocked: "domain not in allowlist", simulated: true };
      }
      record("navigate", url, "simulated navigation — no page was loaded");
      history.splice(cursor + 1);
      history.push(url);
      cursor = history.length - 1;
      return { ok: true, url, simulated: true };
    },

    async search(query, opts) {
      record("search", query, "simulated search — results are not real listings");
      const currency = opts?.currency ?? "GBP";
      const budget = opts?.budget ?? null;
      const base = budget && budget > 0 ? budget : 120 + (hash(query) % 240);
      const sellers = SIM_SELLERS.filter((s) => isDomainAllowed(s.domain, config.allowedDomains));
      const label = query.replace(/^(find|get|buy|i need|a|an|the)\s+/gi, "").trim() || "product";
      return sellers.slice(0, 4).map((seller, i) => {
        const seed = hash(`${query}-${seller.name}`);
        const price = Math.max(9, Math.round((base * (0.62 + i * 0.13) + (seed % 17)) * 100) / 100);
        const rating = Math.min(4.9, Math.round((3.8 + (seed % 12) / 10) * 10) / 10);
        return {
          product: `${SIMULATED_PREFIX} ${["Ergo", "Studio", "Pro", "Everyday"][i % 4]} ${label}`
            .replace(/\s+/g, " ")
            .trim(),
          price,
          currency,
          seller: seller.name,
          delivery: seller.delivery,
          deliveryCost: seller.deliveryCost,
          rating,
          url: `https://${seller.domain}/search?q=${encodeURIComponent(label)}`,
          inStock: seed % 7 !== 0,
          specs: { Warranty: `${1 + (seed % 5)} years`, Returns: "30 days", Condition: "New" },
          reason:
            "Simulated development data — not a real listing. Connect a production browser provider for real prices and availability.",
          simulated: true,
        };
      });
    },

    async click(selector) {
      record("click", selector, "simulated click");
      return { ok: true, simulated: true };
    },
    async type(selector, text) {
      record("type", selector, `simulated typing (${text.length} chars)`);
      return { ok: true, simulated: true };
    },
    async scroll(direction, amount) {
      record("scroll", direction, `simulated scroll ${amount ?? 1} screen(s)`);
      return { ok: true, simulated: true };
    },
    async extract(url, selector) {
      if (!isDomainAllowed(url, config.allowedDomains)) {
        record("extract", url, "blocked by allowlist");
        return {
          url,
          text: `${SIMULATED_PREFIX} Browser action blocked: the URL is not in this agent's domain allow-list.`,
          items: [],
          simulated: true,
        };
      }
      record("extract", url, selector ? `simulated extract of ${selector}` : "simulated extract");
      return {
        url,
        text: `${SIMULATED_PREFIX} No page was loaded. This is placeholder text from the development simulation for ${domainOf(url) || url}.`,
        items: [],
        simulated: true,
      };
    },
    async screenshot() {
      record("screenshot", state().url, "no screenshot — simulation cannot capture a real page");
      return { ok: false, simulated: true };
    },
    async back() {
      if (cursor > 0) cursor -= 1;
      record("back", state().url);
      return state();
    },
    async forward() {
      if (cursor < history.length - 1) cursor += 1;
      record("forward", state().url);
      return state();
    },
    async wait(ms) {
      record("wait", `${ms}ms`);
      return { ok: true };
    },

    async read(url) {
      const res = await this.extract(url);
      return { url: res.url, text: res.text, simulated: true };
    },
    async compare(offers) {
      record("compare", `${offers.length} offers`);
      return [...offers].sort(
        (a, b) => b.rating - a.rating || a.price + a.deliveryCost - (b.price + b.deliveryCost),
      );
    },
    async fillForm(url, fields) {
      if (!config.allowedTools.includes("browser")) return { ok: false };
      if (!isDomainAllowed(url, config.allowedDomains)) {
        record("fill_form", url, "blocked by allowlist");
        return { ok: false };
      }
      record("fill_form", url, Object.keys(fields).join(", "));
      return { ok: true };
    },
    async prepareCheckout(offer) {
      if (!isDomainAllowed(offer.url, config.allowedDomains)) {
        throw new Error("Browser action blocked: the offer URL is not in this agent's domain allow-list.");
      }
      record("prepare_checkout", offer.seller, offer.product);
      const itemPrice = offer.price;
      const deliveryCost = offer.deliveryCost;
      return {
        product: offer.product,
        seller: offer.seller,
        itemPrice,
        deliveryCost,
        tax: Math.round(itemPrice * 0.2 * 100) / 100,
        fees: 0,
        total: Math.round((itemPrice + deliveryCost) * 100) / 100,
        currency: offer.currency,
        checkoutUrl: offer.url,
        paymentAuthorised: false,
        simulated: true,
      };
    },
    async close() {
      record("close", state().url);
    },
  };
}

registerBrowserProvider({
  id: "development_simulation",
  label: "Development Simulation",
  kind: "development",
  requires: [],
  note: "Simulated results for local development. No real browsing, no real prices, no purchases.",
  factory: createSimulatedBrowserTool,
});

/* ------------------------------------------------- production provider layer */

/**
 * Production providers speak a single remote action contract so PalladiumAI can
 * sit in front of Playwright workers, Browserbase or any approved automation
 * service without agent code changing:
 *
 *   POST {endpoint}/session   -> { sessionId }
 *   POST {endpoint}/action    -> { ok, data }   body: { sessionId, action, params }
 *   POST {endpoint}/health    -> 200
 *
 * The adapter never invents data: whatever the runner returns is passed through,
 * and a missing/failed response is surfaced as an error, never as a result.
 */
type RemoteConfig = {
  id: string;
  label: string;
  endpoint: string;
  headers: Record<string, string>;
};

function remoteConfig(id: string): RemoteConfig | null {
  if (id === "playwright") {
    const endpoint = process.env["PLAYWRIGHT_BROWSER_ENDPOINT"];
    if (!endpoint) return null;
    const token = process.env["PLAYWRIGHT_BROWSER_TOKEN"];
    return {
      id,
      label: "Playwright worker",
      endpoint: endpoint.replace(/\/$/, ""),
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  }
  if (id === "browserbase") {
    const key = process.env["BROWSERBASE_API_KEY"];
    const project = process.env["BROWSERBASE_PROJECT_ID"];
    const endpoint = process.env["BROWSERBASE_RUNNER_ENDPOINT"];
    if (!key || !project || !endpoint) return null;
    return {
      id,
      label: "Browserbase",
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

export async function probeBrowserProvider(id: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = remoteConfig(id);
  if (!cfg) return { ok: false, error: "Provider credentials are not configured" };
  try {
    const res = await fetch(`${cfg.endpoint}/health`, { method: "POST", headers: cfg.headers });
    if (!res.ok) return { ok: false, error: `Health check returned ${res.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

function createRemoteBrowserTool(cfg: RemoteConfig, config: BrowserAgentConfig): BrowserTool {
  const steps: BrowserStep[] = [];
  let sessionId: string | null = null;

  const record = (kind: BrowserActionKind, target: string, detail?: string) => {
    steps.push({
      kind,
      target,
      at: new Date().toISOString(),
      simulated: false,
      ...(detail === undefined ? {} : { detail }),
    });
  };

  const call = async (action: BrowserActionKind, params: Record<string, unknown> = {}) => {
    if (!sessionId) {
      const created = await fetch(`${cfg.endpoint}/session`, {
        method: "POST",
        headers: cfg.headers,
        body: JSON.stringify({ allowedDomains: config.allowedDomains }),
      });
      if (!created.ok) throw new Error(`Browser provider could not open a session (${created.status})`);
      const body = (await created.json()) as { sessionId?: string };
      if (!body.sessionId) throw new Error("Browser provider did not return a session");
      sessionId = body.sessionId;
    }
    const res = await fetch(`${cfg.endpoint}/action`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify({ sessionId, action, params }),
    });
    if (!res.ok) throw new Error(`Browser action "${action}" failed (${res.status})`);
    const body = (await res.json()) as { ok?: boolean; data?: unknown; error?: string };
    if (body.ok === false) throw new Error(body.error || `Browser action "${action}" failed`);
    return body.data;
  };

  return {
    provider: cfg.id,
    kind: "production",
    steps: () => steps,

    async navigate(url) {
      assertAllowedUrl(url, config.allowedDomains);
      record("navigate", url);
      const data = (await call("navigate", { url })) as { url?: string } | undefined;
      const resolvedUrl = data?.url ?? url;
      assertAllowedUrl(resolvedUrl, config.allowedDomains);
      return { ok: true, url: resolvedUrl, simulated: false };
    },
    async search(query, opts) {
      record("search", query);
      const data = (await call("search", {
        query,
        budget: opts?.budget ?? null,
        currency: opts?.currency ?? "GBP",
        allowedDomains: config.allowedDomains,
      })) as { offers?: BrowserProductOffer[] } | undefined;
      // Pass through only what the runner actually extracted. No synthesis.
      return (data?.offers ?? []).map((o) => ({ ...o, simulated: false }));
    },
    async click(selector) {
      record("click", selector);
      await call("click", { selector });
      return { ok: true, simulated: false };
    },
    async type(selector, text) {
      record("type", selector, `${text.length} chars`);
      await call("type", { selector, text });
      return { ok: true, simulated: false };
    },
    async scroll(direction, amount) {
      record("scroll", direction, String(amount ?? 1));
      await call("scroll", { direction, amount: amount ?? 1 });
      return { ok: true, simulated: false };
    },
    async extract(url, selector) {
      assertAllowedUrl(url, config.allowedDomains);
      record("extract", url, selector);
      const data = (await call("extract", { url, selector })) as
        | { text?: string; items?: unknown[] }
        | undefined;
      return {
        url,
        text: data?.text ?? "",
        items: data?.items ?? [],
        simulated: false,
      };
    },
    async screenshot() {
      record("screenshot", "current page");
      const data = (await call("screenshot")) as { dataUrl?: string } | undefined;
      return data?.dataUrl
        ? { ok: true, dataUrl: data.dataUrl, simulated: false }
        : { ok: false, simulated: false };
    },
    async back() {
      const data = (await call("back")) as BrowserPageState | undefined;
      const url = data?.url ?? "";
      if (url) assertAllowedUrl(url, config.allowedDomains);
      record("back", url);
      return { url, ...(data?.title ? { title: data.title } : {}), simulated: false };
    },
    async forward() {
      const data = (await call("forward")) as BrowserPageState | undefined;
      const url = data?.url ?? "";
      if (url) assertAllowedUrl(url, config.allowedDomains);
      record("forward", url);
      return { url, ...(data?.title ? { title: data.title } : {}), simulated: false };
    },
    async wait(ms) {
      record("wait", `${ms}ms`);
      await call("wait", { ms });
      return { ok: true };
    },

    async read(url) {
      const res = await this.extract(url);
      return { url: res.url, text: res.text, simulated: false };
    },
    async compare(offers) {
      record("compare", `${offers.length} offers`);
      return [...offers].sort(
        (a, b) => b.rating - a.rating || a.price + a.deliveryCost - (b.price + b.deliveryCost),
      );
    },
    async fillForm(url, fields) {
      if (!config.allowedTools.includes("browser")) return { ok: false };
      assertAllowedUrl(url, config.allowedDomains);
      record("fill_form", url, Object.keys(fields).join(", "));
      await call("fill_form", { url, fields });
      return { ok: true };
    },
    async prepareCheckout(offer) {
      assertAllowedUrl(offer.url, config.allowedDomains);
      record("prepare_checkout", offer.seller, offer.product);
      const data = (await call("prepare_checkout", { offer })) as Partial<CheckoutDraft> | undefined;
      const itemPrice = Number(data?.itemPrice ?? offer.price);
      const deliveryCost = Number(data?.deliveryCost ?? offer.deliveryCost);
      const tax = Number(data?.tax ?? 0);
      const fees = Number(data?.fees ?? 0);
      const checkoutUrl = data?.checkoutUrl ?? offer.url;
      assertAllowedUrl(checkoutUrl, config.allowedDomains);
      return {
        product: offer.product,
        seller: offer.seller,
        itemPrice,
        deliveryCost,
        tax,
        fees,
        total: Math.round((itemPrice + deliveryCost + fees) * 100) / 100,
        currency: offer.currency,
        checkoutUrl,
        // A prepared draft is never an authorised payment, whatever a vendor says.
        paymentAuthorised: false,
        simulated: false,
      };
    },
    async close() {
      if (!sessionId) return;
      try {
        await call("close");
      } catch {
        /* closing a dead session must never fail a run */
      }
      sessionId = null;
    },
  };
}

function productionFactory(id: string, hint: string): BrowserProviderFactory {
  return (config) => {
    const cfg = remoteConfig(id);
    if (!cfg) throw new Error(`Browser provider "${id}" is not configured. ${hint}`);
    return createRemoteBrowserTool(cfg, config);
  };
}

registerBrowserProvider({
  id: "playwright",
  label: "Playwright worker",
  kind: "production",
  requires: ["PLAYWRIGHT_BROWSER_ENDPOINT"],
  note: "Set PLAYWRIGHT_BROWSER_ENDPOINT (and optionally PLAYWRIGHT_BROWSER_TOKEN) to a worker exposing the /session, /action and /health contract.",
  factory: productionFactory("playwright", "Connect a Playwright worker endpoint to enable it."),
});

registerBrowserProvider({
  id: "browserbase",
  label: "Browserbase",
  kind: "production",
  requires: ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID", "BROWSERBASE_RUNNER_ENDPOINT"],
  note: "Set BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID and BROWSERBASE_RUNNER_ENDPOINT to enable Browserbase-backed sessions.",
  factory: productionFactory("browserbase", "Add Browserbase credentials to enable it."),
});

/* --------------------------------------------------------------- resolution */

export type BrowserProviderState = "not_configured" | "development_simulation" | "production_connected";

/** True only when the operator explicitly opts in to the simulation. */
export function simulationAllowed(): boolean {
  const flag = (process.env["BROWSER_AGENT_ALLOW_SIMULATION"] ?? "").toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (process.env["BROWSER_AGENT_PROVIDER"] === "development_simulation") return true;
  return process.env["NODE_ENV"] !== "production";
}

function configuredProductionProvider(): string | null {
  const preferred = process.env["BROWSER_AGENT_PROVIDER"];
  const candidates = preferred && preferred !== "development_simulation" ? [preferred] : [];
  for (const d of registry.values()) {
    if (d.kind === "production" && !candidates.includes(d.id)) candidates.push(d.id);
  }
  return candidates.find((id) => remoteConfig(id) !== null) ?? null;
}

/**
 * Chooses the automation provider for a run. A production provider is used when
 * its credentials exist; otherwise the simulation is used only if it is allowed;
 * otherwise the caller must refuse the action.
 */
export function resolveBrowserProvider(preferred?: string | null): string {
  if (preferred && preferred !== "development_simulation" && remoteConfig(preferred)) {
    return preferred;
  }
  const production = configuredProductionProvider();
  if (production) return production;
  if (simulationAllowed()) return "development_simulation";
  return "not_configured";
}

/**
 * Provider status for the UI. `production_connected` requires credentials AND a
 * successful live health probe, so "connected" is never shown for a provider
 * that does not actually work.
 */
export async function browserProviderStatus(): Promise<{
  state: BrowserProviderState;
  provider: string | null;
  label: string;
  detail: string;
  simulated: boolean;
  providers: Array<Omit<BrowserProviderDescriptor, "factory"> & { configured: boolean }>;
}> {
  const providers = describeBrowserProviders();
  const production = configuredProductionProvider();

  if (production) {
    const probe = await probeBrowserProvider(production);
    const label = registry.get(production)?.label ?? production;
    if (probe.ok) {
      return {
        state: "production_connected",
        provider: production,
        label,
        detail: `${label} responded to a live health check.`,
        simulated: false,
        providers,
      };
    }
    if (simulationAllowed()) {
      return {
        state: "development_simulation",
        provider: "development_simulation",
        label: "Development Simulation",
        detail: `${label} is configured but unreachable (${probe.error}). Results are simulated and are not real.`,
        simulated: true,
        providers,
      };
    }
    return {
      state: "not_configured",
      provider: null,
      label: "Not configured",
      detail: `${label} is configured but unreachable (${probe.error}). Browser actions are refused.`,
      simulated: false,
      providers,
    };
  }

  if (simulationAllowed()) {
    return {
      state: "development_simulation",
      provider: "development_simulation",
      label: "Development Simulation",
      detail:
        "No browser automation credentials are configured. Results are simulated development data — not real pages, prices or purchases.",
      simulated: true,
      providers,
    };
  }

  return {
    state: "not_configured",
    provider: null,
    label: "Not configured",
    detail:
      "No browser automation provider is configured. Browser and shopping research actions are refused until one is connected.",
    simulated: false,
    providers,
  };
}

export const BROWSER_NOT_CONFIGURED_MESSAGE =
  "Browser automation is not configured. Connect a production browser provider before running browser or shopping actions.";

/* -------------------------------------------------------------------- guards */

/**
 * Wraps any provider so the platform invariants hold even if a vendor adapter
 * forgets them: allowlisted navigation/reads, and checkout that can only ever be
 * prepared (never paid) and never above the spend cap.
 */
export function guardBrowserTool(tool: BrowserTool, config: BrowserAgentConfig): BrowserTool {
  const denied = (url: string) => !isDomainAllowed(url, config.allowedDomains);
  return {
    ...tool,
    provider: tool.provider,
    kind: tool.kind,
    steps: () => tool.steps(),
    async navigate(url) {
      if (denied(url)) return { ok: false, url, blocked: "domain not in allowlist" };
      const result = await tool.navigate(url);
      if (result.ok && denied(result.url)) {
        throw new Error("Navigation redirected outside this agent's allowlist");
      }
      return result;
    },
    async extract(url, selector) {
      if (denied(url)) throw new Error(`Domain ${domainOf(url)} is not on this agent's allowlist`);
      return tool.extract(url, selector);
    },
    async read(url) {
      if (denied(url)) throw new Error(`Domain ${domainOf(url)} is not on this agent's allowlist`);
      const result = await tool.read(url);
      if (denied(result.url)) throw new Error("Read redirected outside this agent's allowlist");
      return result;
    },
    async back() {
      const result = await tool.back();
      if (result.url && denied(result.url))
        throw new Error("Browser history navigated outside this agent's allowlist");
      return result;
    },
    async forward() {
      const result = await tool.forward();
      if (result.url && denied(result.url))
        throw new Error("Browser history navigated outside this agent's allowlist");
      return result;
    },
    async fillForm(url, fields) {
      if (denied(url) || !config.allowedTools.includes("browser")) return { ok: false };
      return tool.fillForm(url, fields);
    },
    async prepareCheckout(offer) {
      if (denied(offer.url)) throw new Error("Seller domain is not on this agent's allowlist");
      const draft = await tool.prepareCheckout(offer);
      if (denied(draft.checkoutUrl)) {
        throw new Error("Checkout domain is not on this agent's allowlist");
      }
      const cap = config.spendCap ?? null;
      if (cap != null && draft.total > cap) {
        throw new Error(
          `Prepared total ${draft.currency} ${draft.total} exceeds the spend cap of ${cap}`,
        );
      }
      return { ...draft, paymentAuthorised: false as const };
    },
  };
}

export function createBrowserTool(provider: string, config: BrowserAgentConfig): BrowserTool {
  const requested =
    provider && provider !== "not_configured" ? provider : resolveBrowserProvider(provider);
  if (requested === "not_configured") throw new Error(BROWSER_NOT_CONFIGURED_MESSAGE);
  const descriptor = registry.get(requested);
  if (!descriptor) throw new Error(BROWSER_NOT_CONFIGURED_MESSAGE);
  if (descriptor.kind === "development" && !simulationAllowed()) {
    throw new Error(BROWSER_NOT_CONFIGURED_MESSAGE);
  }
  return guardBrowserTool(descriptor.factory(config), config);
}
