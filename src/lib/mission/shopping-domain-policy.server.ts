type Sb = { from: (table: string) => any };

type PermissionRow = {
  tool?: unknown;
  enabled?: unknown;
  allowed_domains?: unknown;
};

const SHOPPING_DOMAIN_TOOLS = ["browser", "shopping_search", "checkout"] as const;

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const hostname = url.hostname.replace(/^www\./, "");
    if (!hostname || url.username || url.password) return null;
    return hostname;
  } catch {
    return null;
  }
}

export function resolveShoppingDomainsFromPermissions(rows: PermissionRow[]): string[] {
  const relevant = rows.filter(
    (row) => row.enabled === true && SHOPPING_DOMAIN_TOOLS.includes(String(row.tool) as (typeof SHOPPING_DOMAIN_TOOLS)[number]),
  );
  if (!relevant.length) return [];

  const domainSets = relevant.map((row) => {
    if (!Array.isArray(row.allowed_domains)) return new Set<string>();
    return new Set(
      row.allowed_domains
        .map(normalizeDomain)
        .filter((domain): domain is string => Boolean(domain)),
    );
  });

  const [first, ...rest] = domainSets;
  if (!first) return [];
  return [...first].filter((domain) => rest.every((set) => set.has(domain))).sort();
}

export async function resolveAgentShoppingDomains(input: {
  sb: Sb;
  userId: string;
  agentId: string | null;
  fallbackDomains: string[];
}): Promise<string[]> {
  if (!input.agentId) {
    return [...new Set(input.fallbackDomains.map(normalizeDomain).filter((domain): domain is string => Boolean(domain)))];
  }

  const result = await input.sb
    .from("tool_permissions")
    .select("tool,enabled,allowed_domains")
    .eq("user_id", input.userId)
    .eq("agent_id", input.agentId)
    .eq("enabled", true)
    .in("tool", [...SHOPPING_DOMAIN_TOOLS]);
  if (result.error) throw new Error(result.error.message);

  return resolveShoppingDomainsFromPermissions((result.data ?? []) as PermissionRow[]);
}
