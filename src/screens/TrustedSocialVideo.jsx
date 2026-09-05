import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, FileVideo2, Loader2, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import PageHeader from "@/components/palladium/PageHeader";
import {
  beginTrustedMediaUpload,
  finalizeTrustedMediaUpload,
  listTrustedMediaAssets,
} from "@/lib/media/trusted-media.functions";

function bytes(value) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return "—";
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(size / 1024)} KB`;
}

function duration(value) {
  const seconds = Number(value ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

export default function TrustedSocialVideo() {
  const [assets, setAssets] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setAssets(await listTrustedMediaAssets({ data: { limit: 100 } }) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load trusted media assets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function upload(event) {
    event.preventDefault();
    if (!file) return setError("Choose an MP4 video first.");
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) return setError("Trusted social video currently accepts MP4 files only.");
    if (file.size > 512 * 1024 * 1024) return setError("The governed upload limit is 512 MB.");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const pending = await beginTrustedMediaUpload({ data: { filename: file.name, mimeType: "video/mp4" } });
      const response = await fetch(pending.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: file,
      });
      if (!response.ok) throw new Error(`Private media upload failed (${response.status}).`);
      const ready = await finalizeTrustedMediaUpload({ data: { assetId: pending.assetId } });
      setFile(null);
      const input = document.getElementById("trusted-video-file");
      if (input) input.value = "";
      setNotice(`${ready.filename ?? file.name} is verified and ready for approval-gated publishing.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload and verify this video.");
    } finally {
      setBusy(false);
    }
  }

  async function copyId(id) {
    try {
      await navigator.clipboard.writeText(id);
      setNotice("Trusted asset ID copied.");
    } catch {
      setNotice(`Trusted asset ID: ${id}`);
    }
  }

  const readyAssets = assets.filter((asset) => asset.status === "ready");

  return (
    <>
      <PageHeader
        eyebrow="Governed media"
        title="Trusted Social Video"
        description="Upload private MP4 video into Blackstar, verify its real size and duration server-side, then use only verified assets for approval-gated TikTok Direct Post and YouTube resumable publishing."
        action={<button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5"><RefreshCw className="h-4 w-4" />Refresh</button>}
      />

      {(error || notice) && <div className={`mb-5 rounded-xl border p-3 text-sm ${error ? "border-red-400/20 bg-red-500/[.06] text-red-200" : "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200"}`}>{error || notice}</div>}

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="mb-3 flex items-center gap-2"><Upload className="h-4 w-4 text-violet-300" /><h2 className="font-semibold text-white">Upload verified video</h2></div>
          <p className="mb-4 text-xs leading-5 text-zinc-500">Files remain in Blackstar's private trusted-media bucket. The browser never supplies a remote source URL to TikTok or YouTube.</p>
          <form onSubmit={upload} className="space-y-4">
            <label className="block rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
              <span className="mb-2 block text-xs font-medium text-zinc-300">MP4 video · maximum 512 MB</span>
              <input id="trusted-video-file" type="file" accept="video/mp4,.mp4" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black" />
              {file && <span className="mt-2 block text-xs text-zinc-500">{file.name} · {bytes(file.size)}</span>}
            </label>
            <button disabled={busy || !file} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? "Uploading and verifying…" : "Upload & verify"}
            </button>
          </form>
          <div className="mt-5 rounded-xl border border-cyan-400/15 bg-cyan-400/[.04] p-3 text-xs leading-5 text-zinc-400">
            <p className="font-medium text-cyan-100">Execution boundary</p>
            <p className="mt-1">Only assets marked <strong className="text-white">Ready</strong> can enter provider actions. TikTok and YouTube remain Mission Control approval-gated and transport-pinned to native OAuth.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><FileVideo2 className="h-4 w-4 text-cyan-300" /><h2 className="font-semibold text-white">Trusted asset library</h2></div>
            <span className="text-xs text-zinc-500">{readyAssets.length} ready</span>
          </div>
          {loading ? <div className="flex items-center gap-2 py-8 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading assets…</div> : !assets.length ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-500">No trusted videos yet. Upload an MP4 to create the first verified asset.</div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {asset.status === "ready" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />}
                        <p className="truncate text-sm font-medium text-white">{asset.filename}</p>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{bytes(asset.size_bytes)} · {duration(asset.duration_seconds)} · {asset.status}</p>
                      {asset.last_error && <p className="mt-2 text-xs text-red-300">{asset.last_error}</p>}
                    </div>
                    {asset.status === "ready" && <button type="button" onClick={() => copyId(asset.id)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><Copy className="h-3.5 w-3.5" />Copy asset ID</button>}
                  </div>
                  {asset.status === "ready" && <code className="mt-3 block overflow-x-auto rounded-lg bg-black/30 px-2.5 py-2 text-[11px] text-zinc-500">{asset.id}</code>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/social-operations" className="rounded-xl bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 ring-1 ring-violet-400/20 hover:bg-violet-500/20">Continue to Social Operations</Link>
            <p className="text-xs text-zinc-500">Select the native TikTok video or YouTube upload capability and use a Ready asset.</p>
          </div>
        </section>
      </div>
    </>
  );
}
