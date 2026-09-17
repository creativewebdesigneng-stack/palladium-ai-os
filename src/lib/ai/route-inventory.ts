export type BlackstarRouteInventoryItem = {
  route: string;
  source: string;
  dynamic: boolean;
  inspectable: boolean;
};

const ROUTE_FILE_RE = /(?:^|\/)(?:index|[^/]+)\.(?:tsx|ts|jsx|js)$/;
const NON_PAGE_PREFIXES = ["api/", "[.mcp]/", "[.well-known]/"];

function routeFromFile(path: string): string | null {
  const clean = path.replace(/^src\/routes\//, "");
  if (!ROUTE_FILE_RE.test(clean)) return null;
  if (NON_PAGE_PREFIXES.some((prefix) => clean.startsWith(prefix))) return null;
  if (clean === "__root.tsx" || clean === "_shell.tsx" || clean === "_shell/_app.tsx") return null;

  let route = clean.replace(/\.(?:tsx|ts|jsx|js)$/, "");
  route = route.replace(/^_shell\/_app\/?/, "");
  route = route.replace(/^_app\/?/, "");
  route = route.replace(/\.index$/, "");
  route = route.replace(/\./g, "/");
  route = route.replace(/\$([A-Za-z0-9_]+)/g, ":$1");
  route = route.replace(/\[(.*?)\]/g, "$1");
  route = route.replace(/^index$/, "");
  route = `/${route}`.replace(/\/{2,}/g, "/");
  return route.length > 1 ? route.replace(/\/$/, "") : route;
}

export function buildBlackstarRouteInventory(paths: string[]): BlackstarRouteInventoryItem[] {
  const seen = new Set<string>();
  return paths.flatMap((source) => {
    const route = routeFromFile(source);
    if (!route || seen.has(route)) return [];
    seen.add(route);
    const dynamic = route.includes(":") || route.includes("*");
    return [{ route, source, dynamic, inspectable: !dynamic }];
  }).sort((a, b) => a.route.localeCompare(b.route));
}

export function inspectionTargets(inventory: BlackstarRouteInventoryItem[]): string[] {
  return inventory.filter((item) => item.inspectable).map((item) => item.route);
}
