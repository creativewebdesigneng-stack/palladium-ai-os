/**
 * Tool layer for the agent runtime.
 *
 * Every tool call is authorised server-side: the tool must exist, be listed on
 * the agent's `allowed_tools`, and not be disabled (or gated behind approval)
 * in `tool_permissions`. The frontend is never trusted for any of this.
 */
import type { ToolDef } from './model-gateway.server';
import { searchMemory, storeMemory } from '@/lib/memory/memory.server';

export type ToolContext = {
  userId: string;
  orgId: string | null;
  agentId: string;
  taskId: string;
  /** User-scoped Supabase client (RLS applies). */
  sb: { from: (t: string) => any };
  signal?: AbortSignal;
};

type ToolImpl = {
  def: ToolDef;
  /** Tools that can spend money or act outside the app always need approval. */
  sensitive?: boolean;
  run: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

const REGISTRY: Record<string, ToolImpl> = {
  current_time: {
    def: {
      name: 'current_time',
      description: 'Get the current UTC date and time. Use before any date reasoning.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    run: async () => ({ iso: new Date().toISOString() }),
  },

  calculator: {
    def: {
      name: 'calculator',
      description: 'Evaluate an arithmetic expression, e.g. "1200 * 0.2 + 45".',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string', description: 'Arithmetic expression' } },
        required: ['expression'],
      },
    },
    run: async (input) => {
      const expr = str(input['expression']).replace(/[^0-9+\-*/(). %]/g, '');
      if (!expr) return { error: 'Empty or unsupported expression.' };
      try {
        // eslint-disable-next-line no-new-func
        const value = Function(`"use strict"; return (${expr});`)();
        return Number.isFinite(value) ? { expression: expr, value } : { error: 'Result is not a finite number.' };
      } catch {
        return { error: 'Could not evaluate the expression.' };
      }
    },
  },

  web_search: {
    def: {
      name: 'web_search',
      description: 'Search the public web and return short result snippets.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' }, limit: { type: 'number' } },
        required: ['query'],
      },
    },
    run: async (input, ctx) => {
      const query = str(input['query']).slice(0, 300);
      if (!query) return { error: 'A query is required.' };
      const limit = Math.min(Number(input['limit'] ?? 5) || 5, 8);
      const res = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'PalladiumAI-Agent/1.0' },
        signal: ctx.signal ?? AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { error: `Search failed (${res.status}).` };
      const html = await res.text();
      const results: Array<{ title: string; url: string; snippet: string }> = [];
      const blockRe = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = blockRe.exec(html)) && results.length < limit) {
        results.push({ url: decodeDdg(m[1] ?? ''), title: strip(m[2] ?? ''), snippet: strip(m[3] ?? '') });
      }
      return { query, results };
    },
  },

  web_fetch: {
    def: {
      name: 'web_fetch',
      description: 'Fetch a public web page and return its readable text (truncated).',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
    run: async (input, ctx) => {
      const url = str(input['url']);
      if (!/^https?:\/\//i.test(url)) return { error: 'Only absolute http(s) URLs are supported.' };
      if (isPrivateHost(url)) return { error: 'That host is not reachable from the runtime.' };
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PalladiumAI-Agent/1.0' },
        signal: ctx.signal ?? AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { error: `Fetch failed (${res.status}).` };
      const html = await res.text();
      return { url, text: strip(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')).slice(0, 6000) };
    },
  },

  memory_search: {
    def: {
      name: 'memory_search',
      description: "Search the operator's stored preferences and facts.",
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' }, category: { type: 'string' } },
        required: ['query'],
      },
    },
    run: async (input, ctx) => {
      const query = str(input['query']);
      if (!query) return { error: 'A query is required.' };
      try {
        const results = await searchMemory({
          sb: ctx.sb as never,
          userId: ctx.userId,
          query,
          agentId: ctx.agentId,
          limit: 8,
        });
        const category = str(input['category']);
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
        return { error: 'Memory is unavailable right now.' };
      }
    },
  },

  memory_write: {
    def: {
      name: 'memory_write',
      description: 'Store a durable fact or preference for the operator.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['key', 'value'],
      },
    },
    run: async (input, ctx) => {
      const key = str(input['key']).slice(0, 200);
      const value = str(input['value']).slice(0, 4000);
      if (!key) return { error: 'A key is required.' };
      try {
        await storeMemory({
          sb: ctx.sb as never,
          userId: ctx.userId,
          input: {
            content: value || key,
            title: key,
            memory_type: 'long_term',
            category: str(input['category'], 'general'),
            scope: 'private',
            source: 'agent_runtime',
            agent_id: ctx.agentId,
            task_id: ctx.taskId,
            org_id: ctx.orgId,
            importance: 'high',
          },
        });
        return { saved: true, key };
      } catch {
        return { error: 'Could not save that memory.' };
      }
    },
  },

  request_approval: {
    def: {
      name: 'request_approval',
      description:
        'Ask the operator to approve a real-world action (a purchase, an email, an external write). Returns immediately; the action only happens once approved in the Approval Centre.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          action_type: { type: 'string' },
          estimated_cost: { type: 'number' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['title', 'action_type'],
      },
    },
    sensitive: true,
    run: async (input, ctx) => {
      const risk = ['low', 'medium', 'high'].includes(str(input['risk_level'])) ? str(input['risk_level']) : 'medium';
      const { data, error } = await ctx.sb
        .from('approval_requests')
        .insert({
          user_id: ctx.userId,
          org_id: ctx.orgId,
          agent_id: ctx.agentId,
          action_type: str(input['action_type'], 'agent_action').slice(0, 80),
          title: str(input['title']).slice(0, 200),
          summary: str(input['summary']).slice(0, 2000),
          details: { requested_by: 'agent_runtime', task_id: ctx.taskId },
          estimated_cost: Number(input['estimated_cost'] ?? 0) || null,
          risk_level: risk,
          status: 'pending',
        })
        .select('id')
        .maybeSingle();
      if (error) return { error: 'Could not raise an approval request.' };
      return { approval_request_id: data?.id, status: 'pending', note: 'Awaiting operator approval.' };
    },
  },
};

function strip(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
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
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return true;
  }
}

export const TOOL_SLUGS = Object.keys(REGISTRY);

export type ToolGrant = { slug: string; requiresApproval: boolean; allowedDomains: string[] };

/**
 * Resolves which tools this agent may actually use for this run, combining the
 * agent's `allowed_tools` with per-user/per-agent `tool_permissions` overrides.
 */
export async function resolveGrantedTools(
  sb: { from: (t: string) => any },
  agent: { id: string; allowed_tools?: string[] | null; requires_approval?: boolean | null },
): Promise<{ defs: ToolDef[]; grants: Map<string, ToolGrant> }> {
  const requested = (agent.allowed_tools ?? []).filter((slug) => slug in REGISTRY);
  const grants = new Map<string, ToolGrant>();
  if (!requested.length) return { defs: [], grants };

  const { data: perms } = await sb
    .from('tool_permissions')
    .select('tool,enabled,requires_approval,allowed_domains,agent_id')
    .in('tool', requested);

  for (const slug of requested) {
    const rows = (perms ?? []).filter((p: any) => p.tool === slug);
    // An agent-specific row wins over the account-wide default.
    const row = rows.find((p: any) => p.agent_id === agent.id) ?? rows.find((p: any) => !p.agent_id);
    if (row && row.enabled === false) continue;
    grants.set(slug, {
      slug,
      requiresApproval:
        Boolean(REGISTRY[slug]?.sensitive) || Boolean(row?.requires_approval) || Boolean(agent.requires_approval),
      allowedDomains: (row?.allowed_domains as string[] | null) ?? [],
    });
  }

  return { defs: [...grants.keys()].map((slug) => REGISTRY[slug]!.def), grants };
}

/** Executes one tool call. Never throws — failures come back as tool output so
 * the model can recover instead of the whole run dying. */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
  grants: Map<string, ToolGrant>,
): Promise<{ ok: boolean; output: unknown }> {
  const tool = REGISTRY[name];
  const grant = grants.get(name);
  if (!tool || !grant) {
    return { ok: false, output: { error: `Tool "${name}" is not enabled for this agent.` } };
  }

  if (grant.allowedDomains.length && (name === 'web_fetch' || name === 'web_search')) {
    const target = str(input['url']) || str(input['query']);
    const host = /^https?:\/\//i.test(target) ? new URL(target).hostname : '';
    if (host && !grant.allowedDomains.some((d) => host === d || host.endsWith(`.${d}`))) {
      return { ok: false, output: { error: `Domain ${host} is outside this agent's allow-list.` } };
    }
  }

  try {
    const output = await tool.run(input, ctx);
    await ctx.sb.from('tool_executions').insert({
      user_id: ctx.userId,
      org_id: ctx.orgId,
      agent_id: ctx.agentId,
      agent_task_id: ctx.taskId,
      tool: name,
      input,
      output: output as never,
      status: 'succeeded',
    });
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool execution failed.';
    await ctx.sb.from('tool_executions').insert({
      user_id: ctx.userId,
      org_id: ctx.orgId,
      agent_id: ctx.agentId,
      agent_task_id: ctx.taskId,
      tool: name,
      input,
      status: 'failed',
      error: message.slice(0, 500),
    });
    return { ok: false, output: { error: message.slice(0, 300) } };
  }
}
