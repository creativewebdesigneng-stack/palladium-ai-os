import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function resolveValue(value) {
  if (typeof value !== "string") return value;
  return value.startsWith("{{") ? "" : value;
}

function Widget({ widget }) {
  const props = widget.properties || {};
  const style = {
    gridColumn: `${Math.max(1, Number(widget.position?.x || 0) + 1)} / span ${Math.min(12, Math.max(1, Number(widget.position?.w || 4)))}`,
    minHeight: `${Math.max(36, Number(widget.position?.h || 2) * 24)}px`,
  };
  const label = String(resolveValue(props.label) || widget.name || "");
  const text = String(resolveValue(props.text) || widget.name || "");
  const common = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm";
  let node;
  switch (widget.widget_type) {
    case "text": node = <p className="whitespace-pre-wrap text-slate-800">{text}</p>; break;
    case "button": node = <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{label || "Continue"}</button>; break;
    case "input": node = <input className={common} placeholder={String(props.placeholder || label)} />; break;
    case "textarea": node = <textarea className={common} placeholder={String(props.placeholder || label)} />; break;
    case "select": node = <select className={common}><option>{String(props.placeholder || "Select an option")}</option></select>; break;
    case "checkbox": node = <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" />{label}</label>; break;
    case "image": node = props.src ? <img src={String(props.src)} alt={String(props.alt || widget.name)} className="h-full w-full rounded-lg object-cover" /> : <div className="grid h-full place-items-center rounded-lg bg-slate-100 text-xs text-slate-500">Image</div>; break;
    case "divider": node = <hr className="border-slate-200" />; break;
    case "link": node = <a href={String(props.href || "#")} className="text-sm text-indigo-600 underline">{label || text}</a>; break;
    case "stat": node = <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="text-3xl font-semibold text-slate-900">{String(resolveValue(props.value) || "—")}</p></div>; break;
    case "table": node = <div className="overflow-hidden rounded-lg border border-slate-200"><div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{label || "Table"}</div><div className="p-4 text-center text-sm text-slate-400">No data loaded</div></div>; break;
    case "container":
    case "form":
    case "tabs":
    case "modal":
    case "list":
    case "chart":
      node = <div className="h-full rounded-xl border border-slate-200 bg-white/70 p-3"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{widget.widget_type}</p><p className="mt-1 text-sm text-slate-700">{label || widget.name}</p></div>; break;
    default: node = <div className="text-sm text-slate-600">{widget.name}</div>;
  }
  return <div style={style} className="min-w-0">{node}</div>;
}

export default function PublishedStudioApp({ appId }) {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [pageId, setPageId] = useState("");

  useEffect(() => {
    let active = true;
    supabase.rpc("get_published_app_studio_release", { p_app_id: appId }).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure || !data) setError("This application is unavailable or has not been published.");
      else { setDocument(data); setPageId(data.pages?.find((page) => page.is_home)?.id || data.pages?.[0]?.id || ""); }
    });
    return () => { active = false; };
  }, [appId]);

  const page = useMemo(() => document?.pages?.find((item) => item.id === pageId) || document?.pages?.[0], [document, pageId]);
  const widgets = useMemo(() => (document?.widgets || []).filter((item) => item.page_id === page?.id), [document, page]);

  if (error) return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-slate-300"><div><h1 className="text-xl font-semibold text-white">Application unavailable</h1><p className="mt-2 text-sm text-slate-400">{error}</p></div></main>;
  if (!document) return <main className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-400">Loading application…</main>;

  const theme = document.app?.theme || {};
  return (
    <main className="min-h-screen bg-slate-50" style={{ backgroundColor: theme.background || undefined, color: theme.foreground || undefined }}>
      <header className="border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1 className="font-semibold text-slate-900">{document.app?.name}</h1>
          <nav className="flex gap-1">{document.pages?.map((item) => <button key={item.id} onClick={() => setPageId(item.id)} className={`rounded-lg px-3 py-1.5 text-sm ${item.id === page?.id ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"}`}>{item.name}</button>)}</nav>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl grid-cols-12 gap-3 p-5">{widgets.map((widget) => <Widget key={widget.id} widget={widget} />)}{!widgets.length && <div className="col-span-12 py-20 text-center text-sm text-slate-400">This page has no components yet.</div>}</section>
      <footer className="mx-auto max-w-7xl px-5 py-8 text-center text-[11px] text-slate-400">Built with PalladiumAI App Studio · v{document.version}</footer>
    </main>
  );
}
