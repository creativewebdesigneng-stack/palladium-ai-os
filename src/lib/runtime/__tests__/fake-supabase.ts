/**
 * Minimal in-memory Supabase double for runtime tests.
 *
 * It implements only the query shapes the agent runtime uses, so tests can
 * assert on real gate behaviour (permissions, limits, cancellation, timeouts)
 * without a database or any provider network access.
 */
export type Row = Record<string, any>;

type Filter = { op: "eq" | "in"; column: string; value: any };

function matches(row: Row, filters: Filter[]) {
  return filters.every((f) =>
    f.op === "eq" ? row[f.column] === f.value : (f.value as any[]).includes(row[f.column]),
  );
}

export function createFakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));

  const table = (name: string) => (tables[name] ??= []);

  function builder(name: string) {
    const filters: Filter[] = [];
    let mode: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row = {};

    const api: any = {
      select() {
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
      order() {
        return api;
      },
      limit() {
        return api;
      },
      run() {
        const rows = table(name);
        if (mode === "insert") {
          const created = { id: `${name}-${rows.length + 1}`, ...payload };
          rows.push(created);
          return { data: [created], error: null };
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
        return { data: rows.filter((r) => matches(r, filters)), error: null };
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
