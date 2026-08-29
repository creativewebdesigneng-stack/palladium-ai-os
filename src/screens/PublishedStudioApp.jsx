import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  interpretPublicStudioEvent,
  resolvePublicWidgetProperties,
} from "@/lib/app-studio/app-studio-public-runtime";

function safePublicUrl(value, fallback = "#") {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : fallback;
  } catch { return fallback; }
}

function Widget({ widget, properties, value, onValueChange, onEvent, modalOpen, accent }) {
  const props = properties || {};
  const style = {
    gridColumn: `${Math.max(1, Number(widget.position?.x || 0) + 1)} / span ${Math.min(12, Math.max(1, Number(widget.position?.w || 4)))}`,
    minHeight: `${Math.max(36, Number(widget.position?.h || 2) * 24)}px`,
  };
  const label = String(props.label || widget.name || "");
  const text = String(props.text || widget.name || "");
  const common = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm";
  const fire = (name) => {
    const event = widget.events?.[name];
    if (event) onEvent(event);
  };
  let node;
  switch (widget.widget_type) {
    case "text": node = <p className="whitespace-pre-wrap text-slate-800">{text}</p>; break;
    case "button": node = <button type="button" onClick={() => fire("onClick")} style={{ backgroundColor: accent }} className="rounded-lg px-4 py-2 text-sm font-medium text-white">{label || "Continue"}</button>; break;
    case "input": node = <input className={common} value={value ?? String(props.value ?? "")} onChange={(event) => { onValueChange(event.target.value); fire("onChange"); }} placeholder={String(props.placeholder || label)} />; break;
    case "textarea": node = <textarea className={common} value={value ?? String(props.value ?? "")} onChange={(event) => { onValueChange(event.target.value); fire("onChange"); }} placeholder={String(props.placeholder || label)} />; break;
    case "select": {
      const options = Array.isArray(props.options) ? props.options : [];
      node = <select className={common} value={value ?? String(props.value ?? "")} onChange={(event) => { onValueChange(event.target.value); fire("onChange"); }}><option value="">{String(props.placeholder || "Select an option")}</option>{options.slice(0, 100).map((option, index) => { const item = option && typeof option === "object" ? option : { label: String(option), value: String(option) }; return <option key={`${String(item.value ?? index)}-${index}`} value={String(item.value ?? item.label ?? "")}>{String(item.label ?? item.value ?? "")}</option>; })}</select>; break;
    }
    case "checkbox": node = <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" style={{ accentColor: accent }} checked={Boolean(value ?? props.checked)} onChange={(event) => { onValueChange(event.target.checked); fire("onChange"); }} />{label}</label>; break;
    case "image": node = props.src ? <img src={safePublicUrl(props.src, "")} alt={String(props.alt || widget.name)} className="h-full w-full rounded-lg object-cover" /> : <div className="grid h-full place-items-center rounded-lg bg-slate-100 text-xs text-slate-500">Image</div>; break;
    case "divider": node = <hr className="border-slate-200" />; break;
    case "link": node = <a href={safePublicUrl(props.href)} style={{ color: accent }} onClick={(event) => { if (widget.events?.onClick) { event.preventDefault(); fire("onClick"); } }} className="text-sm underline">{label || text}</a>; break;
    case "stat": node = <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="text-3xl font-semibold text-slate-900">{String(props.value ?? "—")}</p></div>; break;
    case "table": {
      const rows = Array.isArray(props.data) ? props.data.slice(0, 100) : [];
      const columns = rows.length && rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0]).slice(0, 12) : [];
      node = <div className="overflow-auto rounded-lg border border-slate-200"><div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{label || "Table"}</div>{rows.length ? <table className="w-full text-left text-xs"><thead><tr>{columns.map((column) => <th key={column} className="border-t border-slate-200 px-3 py-2 font-medium text-slate-500">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column} className="border-t border-slate-100 px-3 py-2 text-slate-700">{String(row?.[column] ?? "")}</td>)}</tr>)}</tbody></table> : <div className="p-4 text-center text-sm text-slate-400">No data loaded</div>}</div>; break;
    }
    case "modal":
      if (!modalOpen && props.defaultOpen !== true) return null;
      node = <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-800">{label || widget.name}</p>{widget.events?.onClose && <button type="button" onClick={() => fire("onClose")} className="text-xs text-slate-500 underline">Close</button>}</div></div>;
      break;
    case "form": node = <form onSubmit={(event) => { event.preventDefault(); fire("onSubmit"); }} className="h-full rounded-xl border border-slate-200 bg-white/70 p-3"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">form</p><p className="mt-1 text-sm text-slate-700">{label || widget.name}</p></form>; break;
    case "container":
    case "tabs":
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
  const [values, setValues] = useState({});
  const [openModals, setOpenModals] = useState([]);

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
  const pageParams = useMemo(() => Object.fromEntries(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search)), [pageId]);

  const handleEvent = (definition) => {
    const event = interpretPublicStudioEvent(definition);
    if (event.type === "navigate") {
      const target = document?.pages?.find((item) => item.id === event.pageId || item.slug === event.pageId);
      if (target) setPageId(target.id);
    } else if (event.type === "open_modal") {
      setOpenModals((current) => current.includes(event.modalId) ? current : [...current, event.modalId]);
    } else if (event.type === "close_modal") {
      setOpenModals((current) => current.filter((id) => id !== event.modalId));
    } else if (event.type === "set_value") {
      setValues((current) => ({ ...current, [event.target]: event.value }));
    }
  };

  if (error) return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-slate-300"><div><h1 className="text-xl font-semibold text-white">Application unavailable</h1><p className="mt-2 text-sm text-slate-400">{error}</p></div></main>;
  if (!document) return <main className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-400">Loading application…</main>;

  const theme = document.app?.theme || {};
  const accent = theme.accent || "#4f46e5";
  const bindingContext = {
    app: { user: null, environment: "published" },
    page: { name: page?.name, params: pageParams },
    queries: {},
  };
  return (
    <main className="min-h-screen bg-slate-50" style={{ backgroundColor: theme.background || undefined, color: theme.foreground || undefined, fontFamily: theme.fontFamily || undefined }}>
      <header className="border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1 className="font-semibold" style={{ color: theme.foreground || undefined }}>{document.app?.name}</h1>
          <nav className="flex gap-1">{document.pages?.map((item) => <button key={item.id} onClick={() => setPageId(item.id)} style={item.id === page?.id ? { color: accent, backgroundColor: `${accent}14` } : undefined} className={`rounded-lg px-3 py-1.5 text-sm ${item.id === page?.id ? "" : "text-slate-500 hover:bg-slate-100"}`}>{item.name}</button>)}</nav>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl grid-cols-12 gap-3 p-5">{widgets.map((widget) => {
        const properties = resolvePublicWidgetProperties(widget.properties, widget.bindings, bindingContext);
        const localValue = values[widget.id] ?? values[widget.name];
        const modalOpen = openModals.includes(widget.id) || openModals.includes(widget.name);
        return <Widget key={widget.id} widget={widget} properties={properties} value={localValue} modalOpen={modalOpen} accent={accent} onValueChange={(value) => setValues((current) => ({ ...current, [widget.id]: value, [widget.name]: value }))} onEvent={handleEvent} />;
      })}{!widgets.length && <div className="col-span-12 py-20 text-center text-sm text-slate-400">This page has no components yet.</div>}</section>
      <footer className="mx-auto max-w-7xl px-5 py-8 text-center text-[11px] text-slate-400">Built with PalladiumAI App Studio · v{document.version}</footer>
    </main>
  );
}
