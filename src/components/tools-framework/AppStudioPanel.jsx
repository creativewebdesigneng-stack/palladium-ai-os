import { useCallback, useEffect, useMemo, useState } from "react";
import { AppWindow, Boxes, Copy, Database, FilePlus2, Loader2, Plus, Rocket, Save, Workflow } from "lucide-react";
import PageHeader from "@/components/palladium/PageHeader";
import AppStudioThemePanel from "@/components/tools-framework/AppStudioThemePanel";
import {
  createStudioApp,
  createStudioRelease,
  getStudioApp,
  listStudioApps,
  saveStudioDatasource,
  saveStudioPage,
  saveStudioQuery,
  saveStudioWidget,
  runStudioQuery,
} from "@/lib/app-studio/app-studio.functions";
import { publishExistingStudioRelease } from "@/lib/app-studio/app-studio-release.functions";
import { cloneStudioApp } from "@/lib/app-studio/app-studio-clone.functions";

const WIDGETS = ["container","text","button","input","textarea","select","checkbox","table","list","image","form","chart","stat","tabs","modal","divider","link"];
const DATASOURCE_PROVIDERS = ["rest", "graphql", "mcp", "integration"];

function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function AppStudioPanel({ toast }) {
  const [apps, setApps] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [document, setDocument] = useState(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [widgetType, setWidgetType] = useState("text");
  const [datasourceName, setDatasourceName] = useState("");
  const [datasourceProvider, setDatasourceProvider] = useState("rest");
  const [datasourceConnectionRef, setDatasourceConnectionRef] = useState("");
  const [selectedDatasourceId, setSelectedDatasourceId] = useState("");
  const [queryName, setQueryName] = useState("");
  const [queryOperation, setQueryOperation] = useState("get");
  const [queryUrl, setQueryUrl] = useState("");
  const [queryDocument, setQueryDocument] = useState("");
  const [queryResult, setQueryResult] = useState(null);

  const loadApps = useCallback(async () => {
    const rows = await listStudioApps({ data: {} });
    setApps(rows);
    setSelectedId((current) => current || rows[0]?.id || "");
  }, []);

  const loadDocument = useCallback(async (id) => {
    if (!id) { setDocument(null); setSelectedPageId(""); return; }
    const next = await getStudioApp({ data: { appId: id } });
    setDocument(next);
    setSelectedPageId((current) => next.pages?.some((item) => item.id === current) ? current : next.pages?.find((item) => item.is_home)?.id || next.pages?.[0]?.id || "");
    setSelectedDatasourceId((current) => next.datasources?.some((item) => item.id === current) ? current : next.datasources?.[0]?.id || "");
  }, []);

  useEffect(() => { loadApps().catch((e) => toast({ title: "App Studio failed to load", description: e.message, variant: "destructive" })); }, [loadApps, toast]);
  useEffect(() => { loadDocument(selectedId).catch((e) => toast({ title: "Application failed to load", description: e.message, variant: "destructive" })); }, [selectedId, loadDocument, toast]);

  const activePage = useMemo(() => document?.pages?.find((page) => page.id === selectedPageId) || document?.pages?.find((page) => page.is_home) || document?.pages?.[0] || null, [document, selectedPageId]);
  const selectedDatasource = useMemo(() => document?.datasources?.find((source) => source.id === selectedDatasourceId) || null, [document, selectedDatasourceId]);

  useEffect(() => {
    if (!selectedDatasource) return;
    if (selectedDatasource.provider === "rest") setQueryOperation("get");
    else if (selectedDatasource.provider === "graphql") setQueryOperation("query");
    else setQueryOperation("");
  }, [selectedDatasource]);

  const act = async (fn, success) => {
    setBusy(true);
    try {
      await fn();
      await loadApps();
      if (selectedId) await loadDocument(selectedId);
      toast({ title: success });
    } catch (e) {
      toast({ title: "App Studio action failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const createApp = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    act(async () => {
      const created = await createStudioApp({ data: { name: cleanName, slug: slugify(cleanName), description: "", applicationType: "web" } });
      setSelectedId(created.app.id); setSelectedPageId(created.page.id); setName("");
    }, "Application created");
  };

  const duplicateApp = () => act(async () => {
    if (!document?.app) throw new Error("Select an application first.");
    const copyName = `${document.app.name} Copy`;
    const copySlug = `${slugify(document.app.slug || document.app.name)}-copy-${Date.now().toString(36)}`.slice(0, 80).replace(/-+$/, "");
    const cloned = await cloneStudioApp({ data: { sourceAppId: document.app.id, name: copyName, slug: copySlug, preserveConnectionRefs: true } });
    setSelectedId(cloned.app.id); setSelectedPageId("");
  }, "Application duplicated");

  const addPage = () => act(async () => {
    const index = (document?.pages?.length || 0) + 1;
    const page = await saveStudioPage({ data: { appId: selectedId, name: `Page ${index}`, slug: `page-${index}`, isHome: false, layout: { type: "canvas", version: 1 }, position: index } });
    setSelectedPageId(page.id);
  }, "Page added");

  const addWidget = () => act(async () => {
    if (!activePage) throw new Error("Create a page first.");
    const count = (document?.widgets || []).filter((item) => item.page_id === activePage.id).length;
    await saveStudioWidget({ data: { appId: selectedId, pageId: activePage.id, widgetType, name: `${widgetType} ${count + 1}`, position: { x: (count % 3) * 4, y: Math.floor(count / 3) * 3, w: 4, h: widgetType === "table" ? 5 : 2 }, properties: widgetType === "text" ? { text: "New text" } : widgetType === "button" ? { label: "Continue" } : {}, bindings: {}, events: {} } });
  }, "Component added");

  const addDatasource = () => act(async () => {
    const cleanName = datasourceName.trim();
    if (!cleanName) throw new Error("Enter a datasource name.");
    const connected = datasourceProvider === "mcp" || datasourceProvider === "integration";
    const connectionRef = datasourceConnectionRef.trim();
    if (connected && !connectionRef) throw new Error("Enter the existing secure connection reference for this datasource.");
    if (datasourceProvider === "mcp" && !connectionRef.startsWith("mcp:")) throw new Error("MCP references must use mcp:<server-id>.");
    if (datasourceProvider === "integration" && !connectionRef.startsWith("integration:")) throw new Error("Integration references must use integration:<provider>.");
    const created = await saveStudioDatasource({ data: { appId: selectedId, name: cleanName, provider: datasourceProvider, connectionRef: connected ? connectionRef : null, config: {}, environment: "development", enabled: true } });
    setSelectedDatasourceId(created.id); setDatasourceName(""); setDatasourceConnectionRef("");
  }, "Datasource added");

  const addQuery = () => act(async () => {
    const source = selectedDatasource;
    if (!source) throw new Error("Select a datasource first.");
    if (!queryName.trim() || !queryOperation.trim()) throw new Error("Enter a query name and operation.");
    if ((source.provider === "rest" || source.provider === "graphql") && !queryUrl.trim()) throw new Error("Enter a public HTTPS URL.");
    if (source.provider === "graphql" && !queryDocument.trim()) throw new Error("Enter a read-only GraphQL query document.");
    const configuration = source.provider === "graphql" ? { url: queryUrl.trim(), document: queryDocument.trim() } : source.provider === "rest" ? { url: queryUrl.trim() } : {};
    await saveStudioQuery({ data: { appId: selectedId, pageId: activePage?.id || null, datasourceId: source.id, name: queryName.trim(), operation: queryOperation.trim(), configuration, runOnLoad: false, requiresApproval: source.provider === "mcp", timeoutMs: 15000 } });
    setQueryName(""); setQueryUrl(""); setQueryDocument("");
  }, "Query added");

  const testQuery = (query) => act(async () => { setQueryResult(await runStudioQuery({ data: { queryId: query.id, input: {} } })); }, "Query completed");
  const release = (publish) => act(() => createStudioRelease({ data: { appId: selectedId, notes: publish ? "Published from App Studio" : "Version checkpoint", publish } }), publish ? "Application published" : "Version saved");
  const activateRelease = (item) => act(() => publishExistingStudioRelease({ data: { appId: selectedId, releaseId: item.id } }), `Version ${item.version} is now live`);

  return <div className="space-y-5">
    <PageHeader eyebrow="Tool Framework" title="App Studio" description="Build real data-connected websites, internal tools and dashboards with pages, components, bindings, queries, environments, themes and versioned releases." />
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <aside className="pglass rounded-2xl p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Applications</p>
        <div className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createApp()} placeholder="New app name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none focus:border-violet-400/50" /><button onClick={createApp} disabled={busy || !name.trim()} className="rounded-lg bg-violet-500 p-2 text-white disabled:opacity-40" aria-label="Create application"><Plus className="h-4 w-4" /></button></div>
        <div className="mt-3 space-y-1.5">{apps.map((app) => <button key={app.id} onClick={() => { setSelectedId(app.id); setSelectedPageId(""); }} className={`w-full rounded-xl border p-3 text-left ${selectedId === app.id ? "border-violet-400/40 bg-violet-500/10" : "border-white/5 bg-white/[.02] hover:bg-white/5"}`}><p className="truncate text-sm font-medium text-white">{app.name}</p><p className="mt-1 text-[10px] text-zinc-500">{app.application_type} · {app.status}</p></button>)}{!apps.length && <p className="py-8 text-center text-xs text-zinc-500">Create your first application.</p>}</div>
      </aside>
      <section className="pglass min-h-[520px] rounded-2xl p-4">{!document ? <div className="grid min-h-[480px] place-items-center text-center text-zinc-500"><div><AppWindow className="mx-auto mb-3 h-9 w-9" /><p className="text-sm">Select or create an application.</p></div></div> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3"><div><h3 className="text-lg font-semibold text-white">{document.app.name}</h3><p className="text-xs text-zinc-500">/{document.app.slug} · {document.pages.length} pages · {document.widgets.length} components</p></div><div className="flex flex-wrap gap-2">{document.app.status === "published" && <a href={`/studio-app/${document.app.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-emerald-400/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10">Open live app</a>}<button onClick={duplicateApp} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><Copy className="h-3.5 w-3.5" />Duplicate</button><button onClick={() => release(false)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><Save className="h-3.5 w-3.5" />Save version</button><button onClick={() => release(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-black hover:bg-emerald-400"><Rocket className="h-3.5 w-3.5" />Publish</button></div></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{document.pages.map((page) => <button key={page.id} onClick={() => setSelectedPageId(page.id)} className={`rounded-lg border px-3 py-1.5 text-xs ${page.id === activePage?.id ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/10 text-zinc-400 hover:bg-white/5"}`}>{page.name}{page.is_home ? " · Home" : ""}</button>)}<button onClick={addPage} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-xs text-zinc-400"><FilePlus2 className="h-3.5 w-3.5" />Page</button></div>
        <div className="mt-3 grid min-h-[380px] grid-cols-12 auto-rows-[54px] gap-2 rounded-xl border border-white/10 bg-black/30 p-3">{(document.widgets || []).filter((widget) => widget.page_id === activePage?.id).map((widget) => { const p = widget.position || {}; return <div key={widget.id} style={{ gridColumn: `${Math.max(1, Number(p.x || 0) + 1)} / span ${Math.min(12, Number(p.w || 4))}`, gridRow: `${Math.max(1, Math.floor(Number(p.y || 0) / 2) + 1)} / span ${Math.max(1, Math.ceil(Number(p.h || 2) / 2))}` }} className="overflow-hidden rounded-lg border border-violet-400/20 bg-violet-500/[.06] p-2"><p className="truncate text-[10px] uppercase tracking-wider text-violet-300">{widget.widget_type}</p><p className="truncate text-xs text-white">{widget.name}</p></div>; })}{!(document.widgets || []).some((widget) => widget.page_id === activePage?.id) && <div className="col-span-12 row-span-4 grid place-items-center text-center text-xs text-zinc-600"><div><Boxes className="mx-auto mb-2 h-7 w-7" />Add components to {activePage?.name || "this page"}.</div></div>}</div>
      </>}</section>
      <aside className="space-y-4">
        <div className="pglass rounded-2xl p-4"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400"><Boxes className="h-4 w-4" />Components</p><select value={widgetType} onChange={(e) => setWidgetType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white">{WIDGETS.map((type) => <option key={type}>{type}</option>)}</select><button onClick={addWidget} disabled={busy || !document} className="mt-2 w-full rounded-lg bg-violet-500 px-3 py-2 text-xs text-white disabled:opacity-40">Add to {activePage?.name || "canvas"}</button></div>
        {document && <AppStudioThemePanel app={document.app} onSaved={() => loadDocument(selectedId)} toast={toast} />}
        <div className="pglass rounded-2xl p-4"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400"><Database className="h-4 w-4" />Data</p><input value={datasourceName} onChange={(e) => setDatasourceName(e.target.value)} placeholder="Datasource name" className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none" /><select value={datasourceProvider} onChange={(e) => { setDatasourceProvider(e.target.value); setDatasourceConnectionRef(""); }} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white">{DATASOURCE_PROVIDERS.map((type) => <option key={type}>{type}</option>)}</select>{(datasourceProvider === "mcp" || datasourceProvider === "integration") && <input value={datasourceConnectionRef} onChange={(e) => setDatasourceConnectionRef(e.target.value)} placeholder={datasourceProvider === "mcp" ? "mcp:<server-id>" : "integration:<provider>"} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none" />}<button onClick={addDatasource} disabled={busy || !document} className="mt-2 w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40">Add datasource</button><div className="mt-3 space-y-1">{document?.datasources?.map((source) => <button key={source.id} onClick={() => setSelectedDatasourceId(source.id)} className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] ${selectedDatasourceId === source.id ? "bg-violet-500/10 text-violet-200" : "bg-white/[.03] text-zinc-400"}`}>{source.name} · {source.provider} · {source.environment}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-zinc-600">Connected integrations and MCP use secure references only. Credentials never enter editable App Studio JSON.</p></div>
        <div className="pglass rounded-2xl p-4"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400"><Workflow className="h-4 w-4" />Queries</p><select value={selectedDatasourceId} onChange={(e) => setSelectedDatasourceId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white"><option value="">Select datasource</option>{document?.datasources?.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.provider}</option>)}</select><input value={queryName} onChange={(e) => setQueryName(e.target.value)} placeholder="Query name" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none" /><input value={queryOperation} onChange={(e) => setQueryOperation(e.target.value)} disabled={selectedDatasource?.provider === "rest" || selectedDatasource?.provider === "graphql"} placeholder={selectedDatasource?.provider === "mcp" ? "MCP tool name" : selectedDatasource?.provider === "integration" ? "Connected action" : "Operation"} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none disabled:opacity-60" />{(selectedDatasource?.provider === "rest" || selectedDatasource?.provider === "graphql") && <input value={queryUrl} onChange={(e) => setQueryUrl(e.target.value)} placeholder="https://api.example.com/data" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none" />}{selectedDatasource?.provider === "graphql" && <textarea value={queryDocument} onChange={(e) => setQueryDocument(e.target.value)} placeholder="query { ... }" rows={4} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 font-mono text-[11px] text-white outline-none" />}<button onClick={addQuery} disabled={busy || !selectedDatasource} className="mt-2 w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40">Add query</button><div className="mt-3 space-y-1">{document?.queries?.map((query) => <button key={query.id} onClick={() => testQuery(query)} className="flex w-full items-center justify-between rounded-lg bg-white/[.03] px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-white/[.06]"><span>{query.name} · {query.operation}</span><span>Run</span></button>)}</div>{queryResult && <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-emerald-300">{JSON.stringify(queryResult, null, 2)}</pre>}</div>
        {!!document?.releases?.length && <div className="pglass rounded-2xl p-4"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400"><Save className="h-4 w-4" />Versions</p><div className="space-y-1.5">{document.releases.slice(0, 8).map((item) => { const live = document.app.published_release_id === item.id; return <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[.03] px-2.5 py-2"><div><p className="text-[11px] text-zinc-300">v{item.version}{live ? " · Live" : ""}</p><p className="max-w-[160px] truncate text-[10px] text-zinc-600">{item.notes || item.status}</p></div><button onClick={() => activateRelease(item)} disabled={busy || live} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-400 disabled:opacity-30">{live ? "Live" : "Make live"}</button></div>; })}</div></div>}
        <div className="pglass rounded-2xl p-4 text-xs text-zinc-500"><p className="flex items-center gap-2 font-medium text-zinc-300"><Workflow className="h-4 w-4" />Safe execution</p><p className="mt-2 leading-5">Queries use existing integrations and MCP. Credentials stay encrypted outside app documents; writes use PalladiumAI approvals.</p></div>
      </aside>
    </div>
    {busy && <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 shadow-xl"><Loader2 className="h-4 w-4 animate-spin" />Saving App Studio changes…</div>}
  </div>;
}
