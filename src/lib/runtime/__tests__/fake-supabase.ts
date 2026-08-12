/**
 * Minimal in-memory Supabase double for runtime tests.
 *
 * It implements only the query shapes the agent runtime uses, so tests can
 * assert on real gate behaviour (permissions, limits, cancellation, timeouts)
 * without a database or any provider network access.
 */
export type Row = Record<string, any>;

type Filter = {
  op: "eq" | "in" | "is" | "gte" | "lte" | "ilike";
  column: string;
  value: any;
};

function matches(row: Row, filters: Filter[]) {
  return filters.every((f) => {
    const cell = row[f.column];
    switch (f.op) {
      case "eq":
        return cell === f.value;
      case "in":
        return (f.value as any[]).includes(cell);
      case "is":
        return f.value === null ? cell === null || cell === undefined : cell === f.value;
      case "gte":
        return cell != null && cell >= f.value;
      case "lte":
        return cell != null && cell <= f.value;
      case "ilike": {
        const pattern = String(f.value).toLowerCase().split("%").filter(Boolean);
        const cellText = String(cell ?? "").toLowerCase();
        return pattern.every((part) => cellText.includes(part));
      }
    }
  });
}

export function createFakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));

  const table = (name: string) => (tables[name] ??= []);

  function builder(name: string) {
    const filters: Filter[] = [];
    let mode: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row = {};

    let counting = false;

    const api: any = {
      select(_columns?: string, options?: { count?: string; head?: boolean }) {
        if (options?.count) counting = true;
        return api;
      },
      insert(values: Row) {
        mode = "insert";
        payload = values;
        return api;
      },
      update(values: Row) {
        mode = "update";
        payload = values;
        return api;
      },
      delete() {
        mode = "delete";
        return api;
      },
      eq(column: string, value: any) {
        filters.push({ op: "eq", column, value });
        return api;
      },
      in(column: string, value: any[]) {
        filters.push({ op: "in", column, value });
        return api;
      },
      is(column: string, value: any) {
        filters.push({ op: "is", column, value });
        return api;
      },
      gte(column: string, value: any) {
        filters.push({ op: "gte", column, value });
        return api;
      },
      lte(column: string, value: any) {
        filters.push({ op: "lte", column, value });
        return api;
      },
      ilike(column: string, value: string) {
        filters.push({ op: "ilike", column, value });
        return api;
      },
      order() {
        return api;
      },
      limit() {
        return api;
      },
      run() {
        const rows = table(name);
        if (mode === "insert") {
          const values = Array.isArray(payload) ? payload : [payload];
          const created = values.map((v: Row, i: number) => ({
            id: `${name}-${rows.length + i + 1}`,
            ...v,
          }));
          rows.push(...created);
          return { data: created, error: null };
        }
        if (mode === "update") {
          const hit = rows.filter((r) => matches(r, filters));
          for (const r of hit) Object.assign(r, payload);
          return { data: hit, error: null };
        }
        if (mode === "delete") {
          const keep = rows.filter((r) => !matches(r, filters));
          const removed = rows.filter((r) => matches(r, filters));
          tables[name] = keep;
          return { data: removed, error: null };
        }
        const found = rows.filter((r) => matches(r, filters));
        if (counting) return { data: null, count: found.length, error: null };
        return { data: found, error: null };
      },

      maybeSingle() {
        const { data, error } = api.run();
        return Promise.resolve({ data: data[0] ?? null, error });
      },
      single() {
        return api.maybeSingle();
      },
      then(resolve: (v: any) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(api.run()).then(resolve, reject);
      },
    };
    return api;
  }

  return {
    tables,
    from: (name: string) => builder(name),
    rpc: async () => ({ data: 0, error: null }),
  };
}
