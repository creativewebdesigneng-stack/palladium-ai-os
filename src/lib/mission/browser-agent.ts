/**
 * Provider-agnostic browser agent abstraction.
 *
 * Mission Control never talks to a browser automation vendor directly. It talks
 * to a `BrowserTool`, so a secure provider (Playwright, Browserbase, a
 * computer-use model, ...) can be registered later without touching agents,
 * tasks or the approval system.
 *
 * Two invariants are enforced here, independently of the provider:
 *  - every navigation is checked against a domain allowlist
 *  - checkout can only ever be *prepared*; the tool cannot pay for anything
 */

export type BrowserStepKind =
  | 'navigate'
  | 'search'
  | 'read'
  | 'compare'
  | 'fill_form'
  | 'prepare_checkout';

export type BrowserStep = {
  kind: BrowserStepKind;
  target: string;
  detail?: string;
  at: string;
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
};

export type BrowserAgentConfig = {
  /** Domains the agent may visit. Empty = nothing is allowed. */
  allowedDomains: string[];
  /** Tools the owning agent has been granted. */
  allowedTools: string[];
  /** Optional hard spend ceiling used when preparing checkout. */
  spendCap?: number | null;
};

export type BrowserTool = {
  readonly provider: string;
  steps(): BrowserStep[];
  navigate(url: string): Promise<{ ok: boolean; url: string; blocked?: string }>;
  search(query: string, opts?: { budget?: number | null; currency?: string }): Promise<BrowserProductOffer[]>;
  read(url: string): Promise<{ url: string; text: string }>;
  compare(offers: BrowserProductOffer[]): Promise<BrowserProductOffer[]>;
  fillForm(url: string, fields: Record<string, string>): Promise<{ ok: boolean }>;
  prepareCheckout(offer: BrowserProductOffer): Promise<CheckoutDraft>;
  close(): Promise<void>;
};

export type BrowserProviderFactory = (config: BrowserAgentConfig) => BrowserTool;

const registry = new Map<string, BrowserProviderFactory>();

export function registerBrowserProvider(name: string, factory: BrowserProviderFactory): void {
  registry.set(name, factory);
}

export function listBrowserProviders(): string[] {
  return [...registry.keys()];
}

export function domainOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isDomainAllowed(url: string, allowed: string[]): boolean {
  const host = domainOf(url);
  if (!host) return false;
  return allowed.some((d) => {
    const clean = d.replace(/^www\./, '').toLowerCase();
    return host === clean || host.endsWith(`.${clean}`);
  });
}

const SELLERS: Array<{ name: string; domain: string; delivery: string; deliveryCost: number }> = [
  { name: 'John Lewis', domain: 'johnlewis.com', delivery: 'Free delivery, 2–4 days', deliveryCost: 0 },
  { name: 'Amazon UK', domain: 'amazon.co.uk', delivery: 'Next-day delivery', deliveryCost: 0 },
  { name: 'Argos', domain: 'argos.co.uk', delivery: 'Click & collect today', deliveryCost: 3.95 },
  { name: 'Currys', domain: 'currys.co.uk', delivery: 'Standard delivery, 3 days', deliveryCost: 4.99 },
  { name: 'IKEA', domain: 'ikea.com', delivery: 'Delivery from £15', deliveryCost: 15 },
];

/**
 * Reference implementation used until a secure automation provider is connected.
 * It performs no network access: it produces deterministic, clearly-simulated
 * results so the full research → compare → approve → checkout flow is testable.
 */
export function createSimulatedBrowserTool(config: BrowserAgentConfig): BrowserTool {
  const steps: BrowserStep[] = [];
  const record = (kind: BrowserStepKind, target: string, detail?: string) => {
    steps.push(detail === undefined ? { kind, target, at: new Date().toISOString() } : { kind, target, detail, at: new Date().toISOString() });
  };

  const hash = (input: string) => {
    let h = 0;
    for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) % 100000;
    return h;
  };

  return {
    provider: 'simulated',
    steps: () => steps,
    async navigate(url) {
      if (!isDomainAllowed(url, config.allowedDomains)) {
        record('navigate', url, 'blocked by allowlist');
        return { ok: false, url, blocked: 'domain not in allowlist' };
      }
      record('navigate', url);
      return { ok: true, url };
    },
    async search(query, opts) {
      record('search', query, 'supported retailers');
      const currency = opts?.currency ?? 'GBP';
      const budget = opts?.budget ?? null;
      const base = budget && budget > 0 ? budget : 120 + (hash(query) % 240);
      const allowed = SELLERS.filter((s) => isDomainAllowed(s.domain, config.allowedDomains));
      const sellers = allowed.length ? allowed : SELLERS.slice(0, 3);
      const label = query.replace(/^(find|get|buy|i need|a|an|the)\s+/gi, '').trim() || 'product';
      return sellers.slice(0, 4).map((seller, i) => {
        const seed = hash(`${query}-${seller.name}`);
        const price = Math.max(9, Math.round((base * (0.62 + i * 0.13) + (seed % 17)) * 100) / 100);
        return {
          product: `${['Ergo', 'Studio', 'Pro', 'Everyday'][i % 4]} ${label}`.replace(/\s+/g, ' '),
          price,
          currency,
          seller: seller.name,
          delivery: seller.delivery,
          deliveryCost: seller.deliveryCost,
          rating: Math.round((3.8 + ((seed % 12) / 10)) * 10) / 10 > 5 ? 4.9 : Math.round((3.8 + ((seed % 12) / 10)) * 10) / 10,
          url: `https://${seller.domain}/search?q=${encodeURIComponent(label)}`,
          inStock: seed % 7 !== 0,
          specs: {
            Warranty: `${1 + (seed % 5)} years`,
            Returns: '30 days',
            Condition: 'New',
          },
          reason: i === 0
            ? 'Best balance of price, rating and delivery for your stated requirement.'
            : i === 1
              ? 'Cheapest in-budget option with acceptable reviews.'
              : 'Alternative with a longer warranty or faster delivery.',
        };
      });
    },
    async read(url) {
      record('read', url);
      return { url, text: `Simulated page summary for ${domainOf(url)}.` };
    },
    async compare(offers) {
      record('compare', `${offers.length} offers`);
      return [...offers].sort((a, b) => (b.rating - a.rating) || (a.price + a.deliveryCost) - (b.price + b.deliveryCost));
    },
    async fillForm(url, fields) {
      if (!config.allowedTools.includes('browser')) return { ok: false };
      record('fill_form', url, Object.keys(fields).join(', '));
      return { ok: true };
    },
    async prepareCheckout(offer) {
      record('prepare_checkout', offer.seller, offer.product);
      const itemPrice = offer.price;
      const deliveryCost = offer.deliveryCost;
      const tax = Math.round(itemPrice * 0.2 * 100) / 100;
      const fees = 0;
      const total = Math.round((itemPrice + deliveryCost + fees) * 100) / 100;
      return {
        product: offer.product,
        seller: offer.seller,
        itemPrice,
        deliveryCost,
        tax,
        fees,
        total,
        currency: offer.currency,
        checkoutUrl: offer.url,
        paymentAuthorised: false,
      };
    },
    async close() {
      /* no-op for the simulated provider */
    },
  };
}

registerBrowserProvider('simulated', createSimulatedBrowserTool);

export function createBrowserTool(provider: string, config: BrowserAgentConfig): BrowserTool {
  const factory = registry.get(provider) ?? registry.get('simulated');
  if (!factory) throw new Error('No browser provider registered');
  return factory(config);
}
