import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, Link2, Megaphone, Plus, RefreshCw, Send } from "lucide-react";
import PageHeader from "@/components/palladium/PageHeader";
import SocialConnectorPanel from "@/components/social/SocialConnectorPanel";
import {
  addSocialPostTarget,
  createSocialPost,
  getNativeTikTokCreatorInfo,
  listLiveSocialCapabilities,
  listNativeMetaSocialAssets,
  listNativePinterestBoards,
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
  if (status === "failed") return "border-red-400/20 bg-red-500/[.06] text-red-200";
  return "border-white/10 bg-white/[.04] text-zinc-300";
}

function privacyLabel(value) {
  return ({
    PUBLIC_TO_EVERYONE: "Everyone",
    MUTUAL_FOLLOW_FRIENDS: "Friends",
    FOLLOWER_OF_CREATOR: "Followers",
    SELF_ONLY: "Only me",
  })[value] ?? value;
}

export default function SocialOperations() {
  const [posts, setPosts] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [metaAssets, setMetaAssets] = useState([]);
  const [pinterestBoards, setPinterestBoards] = useState([]);
  const [tiktokCreator, setTikTokCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", content: "", campaign: "", scheduledFor: "" });
  const [targetForm, setTargetForm] = useState({
    postId: "",
    capabilityKey: "",
    pageId: "",
    boardId: "",
    imageUrl: "",
    link: "",
    privacyLevel: "",
    allowComment: true,
    autoAddMusic: true,
    brandContent: false,
    brandOrganic: false,
    musicUsageConfirmed: false,
    actionInput: "{}",
  });

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [nextPosts, nextCapabilities, nextMetaAssets, nextPinterestBoards, nextTikTokCreator] = await Promise.all([
        listSocialPosts({ data: { limit: 100 } }),
        listLiveSocialCapabilities().catch(() => []),
        listNativeMetaSocialAssets().catch(() => []),
        listNativePinterestBoards().catch(() => []),
        getNativeTikTokCreatorInfo().catch(() => null),
      ]);
      setPosts(nextPosts ?? []);
      setCapabilities(nextCapabilities ?? []);
      setMetaAssets(nextMetaAssets ?? []);
      setPinterestBoards(nextPinterestBoards ?? []);
      setTikTokCreator(nextTikTokCreator ?? null);
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
  const nativePinterest = selectedCapability?.provider === "pinterest"
    && selectedCapability?.action === "pinterest_image_pin"
    && selectedCapability?.transport === "direct_oauth";
  const nativeTikTok = selectedCapability?.provider === "tiktok"
    && selectedCapability?.action === "tiktok_photo_post"
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
      } else if (capability.provider === "pinterest" && capability.action === "pinterest_image_pin" && capability.transport === "direct_oauth") {
        if (!targetForm.boardId) throw new Error("Choose a Pinterest board first.");
        if (!targetForm.imageUrl.trim()) throw new Error("Add the HTTPS image URL for this Pin.");
        actionInput = {
          board_id: targetForm.boardId,
          image_url: targetForm.imageUrl.trim(),
          ...(targetForm.link.trim() ? { link: targetForm.link.trim() } : {}),
        };
      } else if (capability.provider === "tiktok" && capability.action === "tiktok_photo_post" && capability.transport === "direct_oauth") {
        if (!tiktokCreator) throw new Error("TikTok creator controls are unavailable. Reconnect TikTok and try again.");
        if (!targetForm.imageUrl.trim()) throw new Error("Add an HTTPS image URL under a prefix verified for the Blackstar TikTok app.");
        if (!targetForm.privacyLevel) throw new Error("Choose a TikTok privacy level first.");
        if (!targetForm.musicUsageConfirmed) throw new Error("Confirm TikTok's Music Usage requirement before attaching this destination.");
        actionInput = {
          image_url: targetForm.imageUrl.trim(),
          privacy_level: targetForm.privacyLevel,
          allow_comment: targetForm.allowComment,
          auto_add_music: targetForm.autoAddMusic,
          brand_content: targetForm.brandContent,
          brand_organic: targetForm.brandOrganic,
          music_usage_confirmed: true,
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
              onChange={(e) => setTargetForm({ ...targetForm, capabilityKey: e.target.value, pageId: "", boardId: "", imageUrl: "", link: "", privacyLevel: "", allowComment: true, autoAddMusic: true, brandContent: false, brandOrganic: false, musicUsageConfirmed: false, actionInput: "{}" })}
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
                  {metaAssets.map((asset) => <option key={asset.pageId} value={asset.pageId}>{asset.pageName}{asset.instagram?.username ? ` · IG @${asset.instagram.username}` : ""}</option>)}
                </select>
                <input type="url" inputMode="url" value={targetForm.link} onChange={(e) => setTargetForm({ ...targetForm, link: e.target.value })} placeholder="Optional HTTPS link" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
                {!metaAssets.length && <p className="text-xs text-amber-200">No publishable Facebook Pages were discovered on the connected Meta account. Reconnect Meta with the required Page permissions or choose the optional connector fallback if one is available.</p>}
              </div>
            ) : nativePinterest ? (
              <div className="space-y-3 rounded-xl border border-red-400/15 bg-red-400/[.035] p-3">
                <div>
                  <p className="text-xs font-medium text-red-100">Native Pinterest destination</p>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-500">Choose a board discovered from your encrypted Pinterest OAuth connection. Blackstar snapshots the saved post title and copy into the approval payload.</p>
                </div>
                <select required value={targetForm.boardId} onChange={(e) => setTargetForm({ ...targetForm, boardId: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#101117] px-3 py-2 text-sm text-zinc-300">
                  <option value="">Choose Pinterest board</option>
                  {pinterestBoards.map((board) => <option key={board.id} value={board.id}>{board.name}{board.privacy ? ` · ${board.privacy.toLowerCase()}` : ""}</option>)}
                </select>
                <input required type="url" inputMode="url" value={targetForm.imageUrl} onChange={(e) => setTargetForm({ ...targetForm, imageUrl: e.target.value })} placeholder="HTTPS image URL for the Pin" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
                <input type="url" inputMode="url" value={targetForm.link} onChange={(e) => setTargetForm({ ...targetForm, link: e.target.value })} placeholder="Optional HTTPS destination link" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
                {!pinterestBoards.length && <p className="text-xs text-amber-200">No Pinterest boards were discovered. Reconnect Pinterest with board permissions or choose the optional connector fallback if one is available.</p>}
              </div>
            ) : nativeTikTok ? (
              <div className="space-y-3 rounded-xl border border-fuchsia-400/15 bg-fuchsia-400/[.035] p-3">
                <div>
                  <p className="text-xs font-medium text-fuchsia-100">Native TikTok Direct Post</p>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-500">{tiktokCreator ? `Publishing as ${tiktokCreator.nickname || tiktokCreator.username || "the connected creator"}. ` : "Creator controls are unavailable. "}Blackstar reads TikTok's current privacy/interaction controls before approval and rechecks them immediately before dispatch.</p>
                </div>
                <input required type="url" inputMode="url" value={targetForm.imageUrl} onChange={(e) => setTargetForm({ ...targetForm, imageUrl: e.target.value })} placeholder="HTTPS photo URL under your TikTok-verified media prefix" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
                <select required value={targetForm.privacyLevel} onChange={(e) => setTargetForm({ ...targetForm, privacyLevel: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#101117] px-3 py-2 text-sm text-zinc-300">
                  <option value="">Choose TikTok privacy</option>
                  {(tiktokCreator?.privacyLevelOptions ?? []).map((level) => <option key={level} value={level}>{privacyLabel(level)}</option>)}
                </select>
                <div className="grid gap-2 text-xs text-zinc-300 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2"><input type="checkbox" checked={targetForm.allowComment} disabled={tiktokCreator?.commentDisabled === true} onChange={(e) => setTargetForm({ ...targetForm, allowComment: e.target.checked })} />Allow comments</label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2"><input type="checkbox" checked={targetForm.autoAddMusic} onChange={(e) => setTargetForm({ ...targetForm, autoAddMusic: e.target.checked })} />Auto-add music</label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2"><input type="checkbox" checked={targetForm.brandContent} onChange={(e) => setTargetForm({ ...targetForm, brandContent: e.target.checked })} />Branded content</label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 p-2"><input type="checkbox" checked={targetForm.brandOrganic} onChange={(e) => setTargetForm({ ...targetForm, brandOrganic: e.target.checked })} />Promoting own brand</label>
                </div>
                <label className="flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[.035] p-2 text-xs leading-5 text-amber-100"><input className="mt-1" type="checkbox" checked={targetForm.musicUsageConfirmed} onChange={(e) => setTargetForm({ ...targetForm, musicUsageConfirmed: e.target.checked })} /><span>I confirm the post complies with TikTok's Music Usage requirements. This confirmation is included in the approval snapshot.</span></label>
                {tiktokCreator?.commentDisabled && <p className="text-xs text-zinc-500">Comments are currently disabled by this TikTok creator/account and cannot be enabled here.</p>}
                {!tiktokCreator && <p className="text-xs text-amber-200">No TikTok creator controls could be loaded. Reconnect the native TikTok account or use the optional connector fallback if available.</p>}
              </div>
            ) : (
              <textarea value={targetForm.actionInput} onChange={(e) => setTargetForm({ ...targetForm, actionInput: e.target.value })} rows={5} spellCheck={false} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-300 outline-none" />
            )}

            <button
              disabled={busy || !capabilities.length || (nativeFacebook && !metaAssets.length) || (nativePinterest && !pinterestBoards.length) || (nativeTikTok && (!tiktokCreator || !tiktokCreator.privacyLevelOptions?.length || !targetForm.musicUsageConfirmed))}
              className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 disabled:opacity-40"
            >Attach destination</button>
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
