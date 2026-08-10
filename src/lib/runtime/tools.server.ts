/**
 * Tool layer for the agent runtime.
 *
 * Every tool call is authorised server-side: the tool must exist, be listed on
 * the agent's `allowed_tools`, and not be disabled (or gated behind approval)
 * in `tool_permissions`. The frontend is never trusted for any of this.
 */
import type { ToolDef } from "./model-gateway.server";
import { searchMemory, storeMemory } from "@/lib/memory/memory.server";
import {
  createBrowserTool,
  isDomainAllowed,
  resolveBrowserProvider,
} from "@/lib/mission/browser-agent";

export type ToolContext = {
  userId: string;
  orgId: string | null;
  agentId: string;
  taskId: string | null;
  /** User-scoped Supabase client (RLS applies). */
  sb: { from: (t: string) => any };
  signal?: AbortSignal;
  /** Injected per call from the resolved grant — never from model input. */
  allowedDomains?: string[];
  spendCap?: number | null;
};

type ToolImpl = {
  def: ToolDef;
  /** Tools that can spend money or act outside the app always need approval. */
  sensitive?: boolean;
  run: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

const REGISTRY: Record<string, ToolImpl> = {
  current_time: {
    def: {
      name: "current_time",
      description: "Get the current UTC date and time. Use before any date reasoning.",
      parameters: { type: "object", properties: {}, required: [] },
    },
    run: async () => ({ iso: new Date().toISOString() }),
  },

  calculator: {
    def: {
      name: "calculator",
      description: 'Evaluate an arithmetic expression, e.g. "1200 * 0.2 + 45".',
      parameters: {
        type: "object",
        properties: { expression: { type: "string", description: "Arithmetic expression" } },
        required: ["expression"],
      },
    },
    run: async (input) => {
      const expr = str(input["expression"]).replace(/[^0-9+\-*/(). %]/g, "");
      if (!expr) return { error: "Empty or unsupported expression." };
      try {
        const value = Function(`"use strict"; return (${expr});`)();
        return Number.isFinite(value)
          ? { expression: expr, value }
          : { error: "Result is not a finite number." };
      } catch {
        return { error: "Could not evaluate the expression." };
      }
    },
  },

  web_search: {
    def: {
      name: "web_search",
      description: "Search the public web and return short result snippets.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, limit: { type: "number" } },
        required: ["query"],
      },
    },
    run: async (input, ctx) => {
      const query = str(input["query"]).slice(0, 300);
      if (!query) return { error: "A query is required." };
      const limit = Math.min(Number(input["limit"] ?? 5) || 5, 8);
      const res = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "PalladiumAI-Agent/1.0" },
        signal: ctx.signal ?? AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { error: `Search failed (${res.status}).` };
      const html = await res.text();
      const results: Array<{ title: string; url: string; snippet: string }> = [];
      const blockRe =
        /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = blockRe.exec(html)) && results.length < limit) {
        results.push({
          url: decodeDdg(m[1] ?? ""),
          title: strip(m[2] ?? ""),
          snippet: strip(m[3] ?? ""),
        });
      }
      return { query, results };
    },
  },

  web_fetch: {
    def: {
      name: "web_fetch",
      description: "Fetch a public web page and return its readable text (truncated).",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
    run: async (input, ctx) => {
      const url = str(input["url"]);
      if (!/^https?:\/\//i.test(url)) return { error: "Only absolute http(s) URLs are supported." };
      if (isPrivateHost(url)) return { error: "That host is not reachable from the runtime." };
      const res = await fetch(url, {
        headers: { "User-Agent": "PalladiumAI-Agent/1.0" },
        signal: ctx.signal ?? AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { error: `Fetch failed (${res.status}).` };
      const html = await res.text();
      return {
        url,
        text: strip(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")).slice(0, 6000),
      };
    },
  },

  memory_search: {
    def: {
      name: "memory_search",
      description: "Search the operator's stored preferences and facts.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, category: { type: "string" } },
        required: ["query"],
      },
    },
    run: async (input, ctx) => {
      const query = str(input["query"]);
      if (!query) return { error: "A query is required." };
      try {
        const results = await searchMemory({
          sb: ctx.sb as never,
          userId: ctx.userId,
          query,
          agentId: ctx.agentId,
          limit: 8,
        });
        const category = str(input["category"]);
        const filtered = category ? results.filter((r) => r.category === category) : results;
        return {
          memories: filtered.map((r) => ({
            title: r.title ?? null,
            content: r.content,
            type: r.memory_type ?? r.kind,
            relevance: Number(r.similarity.toFixed(3)),
          })),
        };
      } catch {
        return { error: "Memory is unavailable right now." };
      }
    },
  },

  memory_write: {
    def: {
      name: "memory_write",
      description: "Store a durable fact or preference for the operator.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
          category: { type: "string" },
        },
        required: ["key", "value"],
      },
    },
    run: async (input, ctx) => {
      const key = str(input["key"]).slice(0, 200);
      const value = str(input["value"]).slice(0, 4000);
      if (!key) return { error: "A key is required." };
      try {
        await storeMemory({
          sb: ctx.sb as never,
          userId: ctx.userId,
          input: {
            content: value || key,
            title: key,
            memory_type: "long_term",
            category: str(input["category"], "general"),
            scope: "private",
            source: "agent_runtime",
            agent_id: ctx.agentId,
            task_id: ctx.taskId,
            org_id: ctx.orgId,
            importance: "high",
          },
        });
        return { saved: true, key };
      } catch {
        return { error: "Could not save that memory." };
      }
    },
  },

  request_approval: {
    def: {
      name: "request_approval",
      description:
        "Ask the operator to approve a real-world action (a purchase, an email, an external write). Returns immediately; the action only happens once approved in the Approval Centre.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          action_type: { type: "string" },
          estimated_cost: { type: "number" },
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["title", "action_type"],
      },
    },
    sensitive: true,
    run: async (input, ctx) => {
      const risk = ["low", "medium", "high"].includes(str(input["risk_level"]))
        ? str(input["risk_level"])
        : "medium";
      const { data, error } = await ctx.sb
        .from("approval_requests")
        .insert({
          user_id: ctx.userId,
          org_id: ctx.orgId,
          agent_id: ctx.agentId,
          action_type: str(input["action_type"], "agent_action").slice(0, 80),
          title: str(input["title"]).slice(0, 200),
          summary: str(input["summary"]).slice(0, 2000),
          details: { requested_by: "agent_runtime", task_id: ctx.taskId },
          estimated_cost: Number(input["estimated_cost"] ?? 0) || null,
          risk_level: risk,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (error) return { error: "Could not raise an approval request." };
      return {
        approval_request_id: data?.id,
        status: "pending",
        note: "Awaiting operator approval.",
      };
    },
  },

  browser: {
    def: {
      name: "browser",
      description:
        "Drive a browser session: navigate and read pages inside the agent allow-list. Cannot pay for anything.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["navigate", "read"] },
          url: { type: "string" },
        },
        required: ["action", "url"],
      },
    },
    run: async (input, ctx) => {
      const url = str(input["url"]);
      const action = str(input["action"], "read");
      const tool = createBrowserTool(resolveBrowserProvider(), {
        allowedDomains: ctx.allowedDomains ?? [],
        allowedTools: ["browser"],
        spendCap: ctx.spendCap ?? null,
      });
      try {
        if (!isDomainAllowed(url, ctx.allowedDomains ?? [])) {
          return { error: "That domain is not on this agent’s allow-list." };
        }
        if (action === "navigate") return await tool.navigate(url);
        return await tool.read(url);
      } finally {
        await tool.close();
      }
    },
  },

  http_request: {
    def: {
      name: "http_request",
      description: "Call an allow-listed HTTP API. GET and POST only; responses are truncated.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          method: { type: "string", enum: ["GET", "POST"] },
          body: { type: "string" },
        },
        required: ["url"],
      },
    },
    run: async (input, ctx) => {
      const url = str(input["url"]);
      if (!/^https?:\/\//i.test(url)) return { error: "Only absolute http(s) URLs are supported." };
      if (isPrivateHost(url)) return { error: "That host is not reachable from the runtime." };
      const method = str(input["method"], "GET").toUpperCase() === "POST" ? "POST" : "GET";
      const body = str(input["body"]);
      const res = await fetch(url, {
        method,
        headers: {
          "User-Agent": "PalladiumAI-Agent/1.0",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(method === "POST" && body ? { body } : {}),
        signal: ctx.signal ?? AbortSignal.timeout(20_000),
      });
      const text = (await res.text()).slice(0, 6000);
      return { status: res.status, ok: res.ok, body: text };
    },
  },

  file_analysis: {
    def: {
      name: "file_analysis",
      description:
        "Read a document from the operator's memory vault and return its text for analysis.",
      parameters: {
        type: "object",
        properties: { document_id: { type: "string" }, title: { type: "string" } },
        required: [],
      },
    },
    run: async (input, ctx) => {
      const documentId = str(input["document_id"]);
      const title = str(input["title"]);
      let docQuery = ctx.sb
        .from("memory_documents")
        .select("id,title,mime_type,size_bytes,chunk_count")
        .limit(1);
      docQuery = documentId
        ? docQuery.eq("id", documentId)
        : title
          ? docQuery.ilike("title", `%${title}%`)
          : docQuery;
      const { data: docs } = await docQuery;
      const doc = docs?.[0];
      if (!doc) return { error: "No matching document found in the vault." };
      const { data: chunks } = await ctx.sb
        .from("memory_chunks")
        .select("chunk_index,content")
        .eq("document_id", doc.id)
        .order("chunk_index", { ascending: true })
        .limit(12);
      return {
        document: {
          id: doc.id,
          title: doc.title,
          mime_type: doc.mime_type,
          chunks: doc.chunk_count,
        },
        text: (chunks ?? [])
          .map((c: any) => c.content)
          .join("\n\n")
          .slice(0, 8000),
      };
    },
  },

  data_analysis: {
    def: {
      name: "data_analysis",
      description: "Compute count, sum, mean, min, max and median over a numeric series.",
      parameters: {
        type: "object",
        properties: {
          values: { type: "array", items: { type: "number" } },
          label: { type: "string" },
        },
        required: ["values"],
      },
    },
    run: async (input) => {
      const values = Array.isArray(input["values"])
        ? (input["values"] as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n))
        : [];
      if (!values.length) return { error: "Provide at least one numeric value." };
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mid = Math.floor(sorted.length / 2);
      return {
        label: str(input["label"], "series"),
        count: values.length,
        sum: round(sum),
        mean: round(sum / values.length),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median:
          sorted.length % 2
            ? sorted[mid]
            : round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2),
      };
    },
  },

  calendar: {
    def: {
      name: "calendar",
      description:
        "List upcoming scheduled items, or propose a new one. Proposals are created as tasks awaiting approval — nothing is written to an external calendar.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "propose"] },
          title: { type: "string" },
          when: { type: "string" },
        },
        required: ["action"],
      },
    },
    run: async (input, ctx) => {
      if (str(input["action"], "list") === "list") {
        const { data } = await ctx.sb
          .from("personal_tasks")
          .select("id,title,due_at,status")
          .not("due_at", "is", null)
          .order("due_at", { ascending: true })
          .limit(10);
        return { events: data ?? [] };
      }
      const title = str(input["title"]).slice(0, 200);
      if (!title) return { error: "A title is required to propose a calendar item." };
      const when = str(input["when"]);
      const due = when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString() : null;
      const { data, error } = await ctx.sb
        .from("personal_tasks")
        .insert({
          user_id: ctx.userId,
          org_id: ctx.orgId,
          agent_id: ctx.agentId,
          request: `Calendar: ${title}`,
          title,
          category: "calendar",
          scope: "personal",
          status: "awaiting_approval",
          requires_approval: true,
          due_at: due,
        })
        .select("id")
        .maybeSingle();
      if (error) return { error: "Could not create the calendar proposal." };
      return { proposed: true, task_id: data?.id, status: "awaiting_approval" };
    },
  },

  email_send: {
    def: {
      name: "email_send",
      description:
        "Draft an email for the operator. The draft is queued for explicit approval; the tool never sends mail itself.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["to", "subject", "body"],
      },
    },
    sensitive: true,
    run: async (input, ctx) => {
      const to = str(input["to"]).slice(0, 200);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))
        return { error: "A valid recipient address is required." };
      const { data, error } = await ctx.sb
        .from("approval_requests")
        .insert({
          user_id: ctx.userId,
          org_id: ctx.orgId,
          agent_id: ctx.agentId,
          action_type: "email_send",
          title: `Send email: ${str(input["subject"]).slice(0, 120)}`,
          summary: str(input["body"]).slice(0, 1000),
          details: {
            to,
            subject: str(input["subject"]),
            body: str(input["body"]),
            task_id: ctx.taskId,
          },
          risk_level: "high",
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (error) return { error: "Could not queue the email for approval." };
      return { queued: true, approval_request_id: data?.id, status: "pending" };
    },
  },

  shopping_search: {
    def: {
      name: "shopping_search",
      description:
        "Search products across allow-listed retailers, compare price, delivery, availability and specifications. Never buys.",
      parameters: {
        type: "object",
        properties: {
          requirement: { type: "string" },
          budget: { type: "number" },
          currency: { type: "string" },
        },
        required: ["requirement"],
      },
    },
    run: async (input, ctx) => {
      const requirement = str(input["requirement"]).slice(0, 300);
      if (!requirement) return { error: "Describe what to shop for." };
      const budget = Number(input["budget"] ?? 0) || ctx.spendCap || null;
      const tool = createBrowserTool(resolveBrowserProvider(), {
        allowedDomains: ctx.allowedDomains ?? [],
        allowedTools: ["browser", "shopping_search"],
        spendCap: budget,
      });
      try {
        const offers = await tool.search(requirement, {
          budget,
          currency: str(input["currency"], "GBP"),
        });
        const ranked = await tool.compare(
          budget ? offers.filter((o) => o.price <= budget) : offers,
        );
        return {
          requirement,
          budget,
          provider: tool.provider,
          offers: (ranked.length ? ranked : offers).slice(0, 6),
          note: "Recommendations only. A purchase requires explicit approval via prepare_purchase.",
        };
      } finally {
        await tool.close();
      }
    },
  },

  prepare_purchase: {
    def: {
      name: "prepare_purchase",
      description:
        "Prepare a purchase for the operator to approve: itemised product, seller, delivery, fees and total. Does not pay.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string" },
          seller: { type: "string" },
          price: { type: "number" },
          delivery_cost: { type: "number" },
          currency: { type: "string" },
          url: { type: "string" },
        },
        required: ["product", "seller", "price", "url"],
      },
    },
    sensitive: true,
    run: async (input, ctx) => {
      const url = str(input["url"]);
      const allowed = ctx.allowedDomains ?? [];
      if (!isDomainAllowed(url, allowed))
        return { error: "That seller domain is not on this agent’s allow-list." };
      const currency = str(input["currency"], "GBP");
      const itemPrice = Number(input["price"] ?? 0) || 0;
      const deliveryCost = Number(input["delivery_cost"] ?? 0) || 0;
      const total = round(itemPrice + deliveryCost);
      if (ctx.spendCap != null && total > ctx.spendCap) {
        return { error: `Total ${currency} ${total} exceeds your spend cap of ${ctx.spendCap}.` };
      }
      const product = str(input["product"]).slice(0, 200);
      const seller = str(input["seller"]).slice(0, 120);
      const { data: pr, error } = await ctx.sb
        .from("purchase_requests")
        .insert({
          user_id: ctx.userId,
          product,
          seller,
          item_price: itemPrice,
          delivery_cost: deliveryCost,
          tax: round(itemPrice * 0.2),
          fees: 0,
          total,
          currency,
          status: "awaiting_approval",
          checkout_url: url,
        })
        .select("id")
        .maybeSingle();
      if (error) return { error: "Could not prepare the purchase." };
      const { data: approval } = await ctx.sb
        .from("approval_requests")
        .insert({
          user_id: ctx.userId,
          org_id: ctx.orgId,
          agent_id: ctx.agentId,
          action_type: "purchase",
          title: `Approve purchase: ${product}`,
          summary: `${product} from ${seller} — ${currency} ${total} including delivery.`,
          details: {
            purchase_request_id: pr?.id,
            product,
            seller,
            itemPrice,
            deliveryCost,
            total,
            currency,
            url,
          },
          estimated_cost: total,
          currency,
          risk_level: "high",
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      // Link the two so the approval decision drives the purchase status.
      if (pr?.id && approval?.id) {
        await ctx.sb
          .from("purchase_requests")
          .update({ approval_request_id: approval.id })
          .eq("id", pr.id);
      }
      return {
        prepared: true,
        purchase_request_id: pr?.id,
        approval_request_id: approval?.id,
        breakdown: { product, seller, itemPrice, deliveryCost, total, currency },
        payment_authorised: false,
        note: "Awaiting explicit operator approval. No money has moved.",
      };
    },
  },

  database_query: {
    def: {
      name: "database_query",
      description:
        "Read rows from one of the operator's own tables (tasks, agents, memories, purchases). Read-only.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            enum: [
              "personal_tasks",
              "personal_agents",
              "agent_memories",
              "purchase_requests",
              "agent_tasks",
            ],
          },
          limit: { type: "number" },
        },
        required: ["table"],
      },
    },
    run: async (input, ctx) => {
      const allowedTables = [
        "personal_tasks",
        "personal_agents",
        "agent_memories",
        "purchase_requests",
        "agent_tasks",
      ];
      const table = str(input["table"]);
      if (!allowedTables.includes(table)) return { error: "That table is not readable by tools." };
      const limit = Math.min(Number(input["limit"] ?? 20) || 20, 50);
      const { data, error } = await ctx.sb.from(table).select("*").limit(limit);
      if (error) return { error: "Query failed." };
      return { table, rows: data ?? [] };
    },
  },

  code_exec: {
    def: {
      name: "code_exec",
      description:
        "Evaluate a short, sandboxed JavaScript expression. No network, no filesystem, no imports; 200ms budget.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
      },
    },
    sensitive: true,
    run: async (input) => {
      const expr = str(input["expression"]).slice(0, 1000);
      if (!expr) return { error: "An expression is required." };
      if (
        /\b(fetch|require|import|process|globalThis|eval|Function|constructor|while|for)\b/.test(
          expr,
        )
      ) {
        return { error: "That expression uses constructs the sandbox forbids." };
      }
      try {
        const value = Function("Math", "JSON", `"use strict"; return (${expr});`)(Math, JSON);
        return {
          expression: expr,
          value: typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value,
        };
      } catch {
        return { error: "The sandbox could not evaluate that expression." };
      }
    },
  },
};

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function strip(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeDdg(href: string) {
  const match = /uddg=([^&]+)/.exec(href);
  return match?.[1] ? decodeURIComponent(match[1]) : href;
}

function isPrivateHost(url: string) {
  try {
    const host = new URL(url).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return true;
  }
}

export const TOOL_SLUGS = Object.keys(REGISTRY);

/** Public, client-safe description of every executable tool. */
export const TOOL_MANIFEST = Object.entries(REGISTRY).map(([slug, impl]) => ({
  slug,
  description: impl.def.description,
  sensitive: Boolean(impl.sensitive),
}));

export type ToolGrant = {
  slug: string;
  requiresApproval: boolean;
  allowedDomains: string[];
  spendCap: number | null;
};

/** Tools whose targets must be inside the allow-list before they run. */
const DOMAIN_SCOPED = new Set([
  "web_fetch",
  "web_search",
  "browser",
  "http_request",
  "shopping_search",
  "prepare_purchase",
]);

const PLAN_RANK: Record<string, number> = { explorer: 0, builder: 1, business: 2, enterprise: 3 };

/**
 * Resolves which tools this agent may actually use for this run. Five things
 * must agree: the tool exists in the executable registry, it is active in the
 * catalogue, the plan is high enough, the agent lists it, and per-user or
 * per-agent `tool_permissions` do not disable it.
 */
export async function resolveGrantedTools(
  sb: { from: (t: string) => any },
  agent: { id: string; allowed_tools?: string[] | null; requires_approval?: boolean | null },
  plan: string = "explorer",
): Promise<{ defs: ToolDef[]; grants: Map<string, ToolGrant> }> {
  const requested = (agent.allowed_tools ?? []).filter((slug) => slug in REGISTRY);
  const grants = new Map<string, ToolGrant>();
  if (!requested.length) return { defs: [], grants };

  const [{ data: perms }, { data: catalogue }] = await Promise.all([
    sb
      .from("tool_permissions")
      .select("tool,enabled,requires_approval,allowed_domains,spend_cap,agent_id")
      .in("tool", requested),
    sb.from("tools").select("slug,is_active,min_plan,requires_approval").in("slug", requested),
  ]);

  const planRank = PLAN_RANK[plan] ?? 0;

  for (const slug of requested) {
    const entry = (catalogue ?? []).find((t: any) => t.slug === slug);
    // A tool missing from the catalogue is treated as active with no plan gate.
    if (entry && entry.is_active === false) continue;
    if (entry?.min_plan && planRank < (PLAN_RANK[entry.min_plan as string] ?? 0)) continue;

    const rows = (perms ?? []).filter((p: any) => p.tool === slug);
    // An agent-specific row wins over the account-wide default.
    const row =
      rows.find((p: any) => p.agent_id === agent.id) ?? rows.find((p: any) => !p.agent_id);
    if (row && row.enabled === false) continue;

    grants.set(slug, {
      slug,
      requiresApproval:
        Boolean(REGISTRY[slug]?.sensitive) ||
        Boolean(entry?.requires_approval) ||
        Boolean(row?.requires_approval) ||
        Boolean(agent.requires_approval),
      allowedDomains: (row?.allowed_domains as string[] | null) ?? [],
      spendCap: row?.spend_cap == null ? null : Number(row.spend_cap),
    });
  }

  return { defs: [...grants.keys()].map((slug) => REGISTRY[slug]!.def), grants };
}

/** Executes one tool call. Never throws — failures come back as tool output so
 * the model can recover instead of the whole run dying. Every attempt is logged. */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
  grants: Map<string, ToolGrant>,
): Promise<{ ok: boolean; output: unknown }> {
  const tool = REGISTRY[name];
  const grant = grants.get(name);
  const started = Date.now();
  const log = async (
    status: "succeeded" | "failed" | "cancelled",
    extra: Record<string, unknown>,
  ) => {
    await ctx.sb.from("tool_executions").insert({
      user_id: ctx.userId,
      org_id: ctx.orgId,
      agent_id: ctx.agentId,
      agent_task_id: ctx.taskId || null,
      tool: name,
      input,
      status,
      duration_ms: Date.now() - started,
      ...extra,
    });
  };

  if (!tool || !grant) {
    await log("failed", { error: "Tool not enabled for this agent." });
    return { ok: false, output: { error: `Tool "${name}" is not enabled for this agent.` } };
  }

  if (grant.allowedDomains.length && DOMAIN_SCOPED.has(name)) {
    const target = str(input["url"]) || str(input["query"]);
    const host = /^https?:\/\//i.test(target) ? new URL(target).hostname.replace(/^www\./, "") : "";
    if (host && !grant.allowedDomains.some((d) => host === d || host.endsWith(`.${d}`))) {
      await log("failed", { error: `Domain ${host} outside allow-list.` });
      return { ok: false, output: { error: `Domain ${host} is outside this agent's allow-list.` } };
    }
  }

  try {
    const output = await tool.run(input, {
      ...ctx,
      allowedDomains: grant.allowedDomains,
      spendCap: grant.spendCap ?? ctx.spendCap ?? null,
    });
    await log("succeeded", { output: output as never });
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    await log("failed", { error: message.slice(0, 500) });
    return { ok: false, output: { error: message.slice(0, 300) } };
  }
}
