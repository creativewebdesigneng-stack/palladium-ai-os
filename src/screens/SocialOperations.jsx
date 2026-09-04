import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, Link2, Megaphone, Plus, RefreshCw, Send } from "lucide-react";
import PageHeader from "@/components/palladium/PageHeader";
import SocialConnectorPanel from "@/components/social/SocialConnectorPanel";
import {
  addSocialPostTarget,
  createSocialPost,
  listLiveSocialCapabilities,
  listNativeMetaSocialAssets,
  listSocialPosts,
  rescheduleSocialPost,
} from "@/lib/social/social-operations.functions";

function formatWhen(value) {
  if (!value) return "Draft";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid schedule" : date.toLocaleString();
}

function statusClass(status) {
  if (status === "published") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (status === "scheduled") return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  if (status === "failed") return "border-red-400/20 bg-red-400/10 text-red-200";
  return "border-white/10 bg-white/[.04] text-zinc-300";
}

export default function SocialOperations() {
  const [posts, setPosts] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [metaAssets, setMetaAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", content: "", campaign: "", scheduledFor: "" });
  const [targetForm, setTargetForm] = useState({
    postId: "",
    capabilityKey: "",
    pageId: "",
    link: "",
    actionInput: "{}",
  });

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [nextPosts, nextCapabilities, nextMetaAssets] = await Promise.all([
        listSocialPosts({ data: { limit: 100 } }),
        listLiveSocialCapabilities().catch(() => []),
        listNativeMetaSocialAssets().catch(() => []),
      ]);
      setPosts(nextPosts ?? []);
      setCapabilities(nextCapabilities ?? []);
      setMetaAssets(nextMetaAssets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load social operations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const metrics = useMemo(() => ({
    scheduled: posts.filter((post) => post.status === "scheduled").length,
    published: posts.filter((post) => post.status === "published").length,
    targets: posts.reduce((sum, post) => sum + (post.social_post_targets?.length ?? 0), 0),
  }), [posts]);

  const selectedCapability = capabilities.find(
    (item) => `${item.provider}:${item.action}` === targetForm.capabilityKey,
  );
  const nativeFacebook = selectedCapability?.provider === "facebook"
    && selectedCapability?.action === "facebook_page_post"
    && selectedCapability?.transport === "direct_oauth";

  async function createPost(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await createSocialPost({
        data: {
          title: form.title,
          content: form.content,
          campaign: form.campaign,
          scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null,
        },
      });
      setForm({ title: "", content: "", campaign: "", scheduledFor: "" });
      setNotice("Social post saved.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create social post.");
    } finally {
      setBusy(false);
    }
  }

  async function attachTarget(event) {
    event.preventDefault();
    const capability = capabilities.find((item) => `${item.provider}:${item.action}` === targetForm.capabilityKey);
    if (!capability) return setError("Choose a live social capability first.");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let actionInput;
      if (capability.provider === "facebook" && capability.action === "facebook_page_post" && capability.transport === "direct_oauth") {
        if (!targetForm.pageId) throw new Error("Choose a Facebook Page first.");
        actionInput = {
          page_id: targetForm.pageId,
          ...(targetForm.link.trim() ? { link: targetForm.link.trim() } : {}),
        };
      } else {
        actionInput = JSON.parse(targetForm.actionInput || "{}");
      }
      const result = await addSocialPostTarget({
        data: {
          postId: targetForm.postId,
          provider: capability.provider,
          action: capability.action,
          actionInput,
        },
      });
      setNotice(result?.capability?.requiresApproval
        ? "Target attached. This external action remains approval-gated by Blackstar."
        : "Target attached to a live Blackstar integration capability.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach social destination.");
    } finally {
      setBusy(false);
    }
  }

  async function unschedule(post) {
    setBusy(true);
    try {
      await rescheduleSocialPost({ data: { postId: post.id, scheduledFor: null } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update schedule.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Marketing operations"
        title="Social Operations"
        description="Connect social accounts, plan multi-platform content, schedule posts and bind each destination to live Blackstar integration capabilities without exposing credentials to agents or the browser."
        action={<button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5"><RefreshCw className="h-4 w-4" />Refresh</button>}
      />

      {(error || notice) && <div className={`mb-5 rounded-xl border p-3 text-sm ${error ? "border-red-400/20 bg-red-500/[.06] text-red-200" : "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200"}`}>{error || notice}</div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Megaphone} label="Content items" value={posts.length} />
        <Metric icon={CalendarClock} label="Scheduled" value={metrics.scheduled} />
        <Metric icon={Send} label="Published" value={metrics.published} />
        <Metric icon={Link2} label="Live targets" value={metrics.targets} />
      </div>

      <SocialConnectorPanel onConnectionsChanged={refresh} />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-violet-300" /><h2 className="font-semibold text-white">Create content</h2></div>
          <form onSubmit={createPost} className="space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Internal title" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Post copy" rows={7} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="Campaign" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
              <input type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300 outline-none" />
            </div>
            <button disabled={busy} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">Save post</button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="mb-2 flex items-center gap-2"><Link2 className="h-4 w-4 text-cyan-300" /><h2 className="font-semibold text-white">Bind a live destination</h2></div>
          <p className="mb-4 text-xs leading-5 text-zinc-500">Native provider connections are preferred. Connector transports remain available only when no equivalent native route is live. Provider credentials are never accepted in this form.</p>
          <form onSubmit={attachTarget} className="space-y-3">
            <select required value={targetForm.postId} onChange={(e) => setTargetForm({ ...targetForm, postId: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#101117] px-3 py-2 text-sm text-zinc-300">
              <option value="">Choose post</option>{posts.map((post) => <option key={post.id} value={post.id}>{post.title || post.content.slice(0, 48)}</option>)}
            </select>
            <select
              required
              value={targetForm.capabilityKey}
              onChange={(e) => setTargetForm({ ...targetForm, capabilityKey: e.target.value, pageId: "", link: "", actionInput: "{}" })}
              className="w-full rounded-xl border border-white/10 bg-[#101117] px-3 py-2 text-sm text-zinc-300"
            >
              <option value="">Choose live social action</option>
              {capabilities.map((cap) => (
                <option key={`${cap.provider}:${cap.action}`} value={`${cap.provider}:${cap.action}`}>
                  {cap.provider} · {cap.action} · {cap.transport === "direct_oauth" ? "native" : cap.transport}{cap.requiresApproval ? " · approval" : ""}
                </option>
              ))}
            </select>

            {nativeFacebook ? (
              <div className="space-y-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[.04] p-3">
                <div>
                  <p className="text-xs font-medium text-cyan-100">Native Meta destination</p>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-500">Blackstar discovered these Pages directly from your encrypted Meta OAuth connection. Page access tokens stay server-side.</p>
                </div>
                <select required value={targetForm.pageId} onChange={(e) => setTargetForm({ ...targetForm, pageId: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#101117] px-3 py-2 text-sm text-zinc-300">
                  <option value="">Choose Facebook Page</option>
                  {metaAssets.map((asset) => (
                    <option key={asset.pageId} value={asset.pageId}>
                      {asset.pageName}{asset.instagram?.username ? ` · IG @${asset.instagram.username}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  inputMode="url"
                  value={targetForm.link}
                  onChange={(e) => setTargetForm({ ...targetForm, link: e.target.value })}
                  placeholder="Optional HTTPS link"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                />
                {!metaAssets.length && <p className="text-xs text-amber-200">No publishable Facebook Pages were discovered on the connected Meta account. Reconnect Meta with the required Page permissions or choose the optional connector fallback if one is available.</p>}
              </div>
            ) : (
              <textarea value={targetForm.actionInput} onChange={(e) => setTargetForm({ ...targetForm, actionInput: e.target.value })} rows={5} spellCheck={false} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-300 outline-none" />
            )}

            <button disabled={busy || !capabilities.length || (nativeFacebook && !metaAssets.length)} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 disabled:opacity-40">Attach destination</button>
          </form>
          {!capabilities.length && !loading && <p className="mt-3 text-xs text-amber-200">No live social publishing capability is connected yet. Connect an account above; Blackstar will discover its typed actions automatically.</p>}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-300" /><h2 className="font-semibold text-white">Content calendar</h2></div><span className="text-xs text-zinc-500">{loading ? "Loading…" : `${posts.length} items`}</span></div>
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-white">{post.title || "Untitled post"}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusClass(post.status)}`}>{post.status}</span></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{post.content}</p><p className="mt-2 text-xs text-zinc-600">{formatWhen(post.scheduled_for)}{post.campaign ? ` · ${post.campaign}` : ""}</p></div>
                {post.status === "scheduled" && <button disabled={busy} onClick={() => unschedule(post)} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">Return to draft</button>}
              </div>
              {!!post.social_post_targets?.length && <div className="mt-3 flex flex-wrap gap-2">{post.social_post_targets.map((target) => <span key={target.id} className="rounded-lg border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] text-zinc-400">{target.provider} · {target.action} · {target.status}</span>)}</div>}
            </article>
          ))}
          {!loading && !posts.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No social content yet.</div>}
        </div>
      </section>
    </>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{label}</p></div>;
}
