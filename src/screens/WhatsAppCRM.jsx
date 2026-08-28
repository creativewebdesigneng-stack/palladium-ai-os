import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Plus, RefreshCw, Radio, Send, Users } from "lucide-react";
import PageHeader from "@/components/palladium/PageHeader";
import {
  createWhatsAppBroadcastDraft,
  listWhatsAppCapabilities,
  listWhatsAppWorkspace,
  openWhatsAppConversation,
  saveWhatsAppDraft,
  updateWhatsAppConversationStatus,
} from "@/lib/whatsapp/whatsapp-crm.functions";

export default function WhatsAppCRM() {
  const [data, setData] = useState({ contacts: [], conversations: [], broadcasts: [] });
  const [capabilities, setCapabilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [broadcast, setBroadcast] = useState({ name: "", templateName: "", bodyPreview: "", contactIds: [] });

  async function refresh() {
    setLoading(true); setError("");
    try {
      const [workspace, live] = await Promise.all([
        listWhatsAppWorkspace({ data: { limit: 150 } }),
        listWhatsAppCapabilities().catch(() => []),
      ]);
      setData(workspace ?? { contacts: [], conversations: [], broadcasts: [] });
      setCapabilities(live ?? []);
      if (selected) setSelected((workspace?.conversations ?? []).find((c) => c.id === selected.id) ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load WhatsApp CRM."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  const summary = useMemo(() => ({
    open: data.conversations.filter((c) => c.status === "open").length,
    unread: data.conversations.reduce((n, c) => n + Number(c.unread_count ?? 0), 0),
    drafts: data.broadcasts.filter((b) => b.status === "draft" || b.status === "scheduled").length,
  }), [data]);

  async function startConversation(contactId) {
    setBusy(true); setError("");
    try { const row = await openWhatsAppConversation({ data: { contactId } }); await refresh(); setSelected({ ...row, whatsapp_messages: [] }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not open conversation."); }
    finally { setBusy(false); }
  }
  async function saveDraft() {
    if (!selected || !draft.trim()) return;
    setBusy(true); setError("");
    try { await saveWhatsAppDraft({ data: { conversationId: selected.id, text: draft } }); setDraft(""); setNotice("WhatsApp draft saved. External send remains controlled by PalladiumAI integration approvals."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save draft."); }
    finally { setBusy(false); }
  }
  async function setStatus(status) {
    if (!selected) return;
    setBusy(true);
    try { await updateWhatsAppConversationStatus({ data: { id: selected.id, status } }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update conversation."); }
    finally { setBusy(false); }
  }
  async function createBroadcast(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await createWhatsAppBroadcastDraft({ data: { ...broadcast, contactIds: broadcast.contactIds } });
      setBroadcast({ name: "", templateName: "", bodyPreview: "", contactIds: [] });
      setNotice(`Broadcast draft created for ${result.recipientCount} contacts. Sending remains approval-gated.`);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create broadcast."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="Customer operations" title="WhatsApp CRM" description="Shared WhatsApp inbox, CRM-linked conversations and broadcast planning built on PalladiumAI's existing CRM, integrations, workflows and approval controls." action={<button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5"><RefreshCw className="h-4 w-4" />Refresh</button>} />
    {(error || notice) && <div className={`mb-5 rounded-xl border p-3 text-sm ${error ? "border-red-400/20 bg-red-500/[.06] text-red-200" : "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200"}`}>{error || notice}</div>}

    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={MessageCircle} label="Conversations" value={data.conversations.length} />
      <Metric icon={Radio} label="Open" value={summary.open} />
      <Metric icon={Users} label="Unread" value={summary.unread} />
      <Metric icon={Send} label="Broadcast drafts" value={summary.drafts} />
    </div>

    <section className="mb-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.035] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-white">WhatsApp connection</h2><p className="mt-1 text-xs text-zinc-400">{capabilities.length ? `${capabilities.length} live WhatsApp/Meta actions discovered from your PalladiumAI integrations.` : "No live WhatsApp action is connected yet. Connect or configure a WhatsApp/Meta provider in Integrations; credentials stay server-side."}</p></div>
        <Link to="/integrations" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2 text-xs font-medium text-emerald-100">Manage connector</Link>
      </div>
      {!!capabilities.length && <div className="mt-3 flex flex-wrap gap-2">{capabilities.slice(0, 12).map((cap) => <span key={`${cap.provider}:${cap.action}`} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300">{cap.provider} · {cap.action}{cap.requiresApproval ? " · approval" : ""}</span>)}</div>}
    </section>

    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Inbox</h2><span className="text-xs text-zinc-500">{loading ? "Loading…" : `${data.conversations.length} threads`}</span></div>
        <div className="space-y-2">
          {data.conversations.map((c) => { const contact = c.crm_contacts; return <button key={c.id} onClick={() => setSelected(c)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === c.id ? "border-violet-400/30 bg-violet-500/10" : "border-white/10 bg-black/20"}`}><div className="flex justify-between gap-2"><span className="text-sm text-white">{contact?.name || contact?.phone || "Unknown contact"}</span><span className="text-[10px] uppercase text-zinc-500">{c.status}</span></div><p className="mt-1 text-xs text-zinc-500">{contact?.phone || "No phone"} · {c.unread_count || 0} unread</p></button>; })}
          {!loading && !data.conversations.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-zinc-500">No WhatsApp conversations yet. Start one from a CRM contact below.</p>}
        </div>
        <div className="mt-4 border-t border-white/10 pt-4"><p className="mb-2 text-xs font-medium text-zinc-300">Start from CRM contact</p><div className="max-h-48 space-y-2 overflow-y-auto">{data.contacts.filter((c) => c.phone).slice(0, 50).map((c) => <button key={c.id} onClick={() => startConversation(c.id)} disabled={busy} className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><span>{c.name}</span><span className="text-zinc-600">{c.phone}</span></button>)}</div></div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <h2 className="font-semibold text-white">Conversation</h2>
        {!selected ? <div className="grid min-h-72 place-items-center text-sm text-zinc-500">Choose a conversation.</div> : <>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setStatus("open")} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300">Open</button><button onClick={() => setStatus("pending")} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300">Pending</button><button onClick={() => setStatus("closed")} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300">Close</button></div>
          <div className="mt-4 min-h-64 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">{(selected.whatsapp_messages ?? []).slice().reverse().map((m) => <div key={m.id} className={`max-w-[85%] rounded-xl p-2.5 text-xs ${m.direction === "outbound" ? "ml-auto bg-violet-500/15 text-violet-100" : "bg-white/[.05] text-zinc-300"}`}><p>{m.text_content || `[${m.content_type}]`}</p><p className="mt-1 text-[10px] text-zinc-600">{m.status}</p></div>)}{!(selected.whatsapp_messages ?? []).length && <p className="text-center text-xs text-zinc-600">No messages stored in this thread yet.</p>}</div>
          <div className="mt-3 flex gap-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Draft a WhatsApp reply…" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"/><button onClick={saveDraft} disabled={busy || !draft.trim()} className="self-end rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">Save draft</button></div>
        </>}
      </section>
    </div>

    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-violet-300"/><h2 className="font-semibold text-white">Broadcast planner</h2></div>
      <form onSubmit={createBroadcast} className="grid gap-3 lg:grid-cols-2"><input required value={broadcast.name} onChange={(e) => setBroadcast({ ...broadcast, name: e.target.value })} placeholder="Campaign name" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/><input value={broadcast.templateName} onChange={(e) => setBroadcast({ ...broadcast, templateName: e.target.value })} placeholder="Approved WhatsApp template name" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/><textarea value={broadcast.bodyPreview} onChange={(e) => setBroadcast({ ...broadcast, bodyPreview: e.target.value })} placeholder="Message preview" rows={4} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white lg:col-span-2"/><div className="lg:col-span-2 rounded-xl border border-white/10 bg-black/20 p-3"><p className="mb-2 text-xs text-zinc-400">Recipients ({broadcast.contactIds.length}/1000)</p><div className="max-h-40 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto">{data.contacts.filter((c) => c.phone).map((c) => <label key={c.id} className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={broadcast.contactIds.includes(c.id)} onChange={(e) => setBroadcast({ ...broadcast, contactIds: e.target.checked ? [...broadcast.contactIds, c.id].slice(0,1000) : broadcast.contactIds.filter((id) => id !== c.id) })}/>{c.name}</label>)}</div></div><button disabled={busy || !broadcast.contactIds.length} className="w-fit rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-100 disabled:opacity-40">Create broadcast draft</button></form>
      {!!data.broadcasts.length && <div className="mt-5 space-y-2">{data.broadcasts.map((b) => <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><div><p className="text-sm text-white">{b.name}</p><p className="text-xs text-zinc-500">{b.whatsapp_broadcast_recipients?.length ?? 0} recipients · {b.template_name || "No template selected"}</p></div><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-zinc-400">{b.status}</span></div>)}</div>}
    </section>
  </>;
}
function Metric({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Icon className="h-4 w-4 text-emerald-300"/><p className="mt-3 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{label}</p></div>; }
