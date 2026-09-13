import { useEffect, useState } from "react";
import { ExternalLink, Pause, Play, Plus, Radar, RefreshCw } from "lucide-react";
import {
  checkLegalRegulatoryWatch,
  listLegalRegulatoryWatches,
  saveLegalRegulatoryWatch,
  updateLegalRegulatoryWatchAutomation,
} from "@/lib/legal/legal-regulatory-watch.functions";
import { JURISDICTIONS } from "@/lib/legal/jurisdictions";

const INTERVALS = [
  { hours: 6, label: "Every 6 hours" },
  { hours: 12, label: "Every 12 hours" },
  { hours: 24, label: "Daily" },
  { hours: 168, label: "Weekly" },
  { hours: 720, label: "Every 30 days" },
];

export default function LegalRegulatoryWatch() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [evidence, setEvidence] = useState({});
  const [form, setForm] = useState({
    name: "",
    jurisdiction: "United Kingdom",
    topic: "",
    authority: "",
    source_url: "",
    status: "active",
    check_interval_hours: 24,
  });

  async function load() {
    try {
      setRows(await listLegalRegulatoryWatches({ data: {} }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load regulatory watches.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy("new");
    try {
      await saveLegalRegulatoryWatch({ data: form });
      setForm((current) => ({
        ...current,
        name: "",
        topic: "",
        authority: "",
        source_url: "",
      }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save watch.");
    } finally {
      setBusy("");
    }
  }

  async function check(id) {
    setBusy(id);
    try {
      const result = await checkLegalRegulatoryWatch({ data: { id } });
      setEvidence((current) => ({ ...current, [id]: result }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regulatory check failed.");
    } finally {
      setBusy("");
    }
  }

  async function updateAutomation(watch, status, interval) {
    setBusy(`automation:${watch.id}`);
    try {
      await updateLegalRegulatoryWatchAutomation({
        data: {
          id: watch.id,
          status,
          check_interval_hours: Number(interval),
        },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update monitoring.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
      <div className="flex items-center gap-2">
        <Radar className="h-4 w-4 text-fuchsia-300" />
        <h2 className="font-medium text-white">Regulatory change watch</h2>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Track official public evidence automatically. A changed evidence fingerprint is a review
        signal, not proof that the law itself changed, and Blackstar does not provide legal advice.
      </p>

      <form onSubmit={save} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Watch name"
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"
        />
        <select
          value={form.jurisdiction}
          onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
          className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white"
        >
          {JURISDICTIONS.map((jurisdiction) => (
            <option key={jurisdiction.id}>{jurisdiction.name}</option>
          ))}
        </select>
        <input
          required
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          placeholder="Topic / regulation"
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"
        />
        <input
          value={form.authority}
          onChange={(e) => setForm({ ...form, authority: e.target.value })}
          placeholder="Regulator / authority"
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"
        />
        <select
          value={form.check_interval_hours}
          onChange={(e) => setForm({ ...form, check_interval_hours: Number(e.target.value) })}
          className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white"
        >
          {INTERVALS.map((interval) => (
            <option key={interval.hours} value={interval.hours}>
              {interval.label}
            </option>
          ))}
        </select>
        <button
          disabled={Boolean(busy)}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-fuchsia-300/15 px-3 py-2 text-xs text-fuchsia-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Add monitored watch
        </button>
        <input
          value={form.source_url}
          onChange={(e) => setForm({ ...form, source_url: e.target.value })}
          placeholder="Optional official source URL — results will be restricted to that host"
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white md:col-span-2 xl:col-span-6"
        />
      </form>

      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

      <div className="mt-4 space-y-2">
        {rows.map((watch) => {
          const currentEvidence = evidence[watch.id];
          const automationBusy = busy === `automation:${watch.id}`;
          return (
            <div key={watch.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-white">{watch.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${
                        watch.status === "active"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-zinc-700/30 text-zinc-400"
                      }`}
                    >
                      {watch.status === "active" ? "automatic" : "paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {watch.jurisdiction} · {watch.topic}
                    {watch.authority ? ` · ${watch.authority}` : ""}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    {watch.last_checked_at
                      ? `Last checked ${new Date(watch.last_checked_at).toLocaleString()}`
                      : "No baseline captured yet"}
                    {watch.status === "active" && watch.next_check_at
                      ? ` · Next scheduled ${new Date(watch.next_check_at).toLocaleString()}`
                      : ""}
                  </p>
                  {watch.last_error && (
                    <p className="mt-1 text-[10px] text-rose-300/80">
                      Last automated attempt: {watch.last_error}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <select
                    value={watch.check_interval_hours ?? 24}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      updateAutomation(watch, watch.status, Number(e.target.value))
                    }
                    className="rounded-lg border border-white/10 bg-[#101116] px-2.5 py-1.5 text-[10px] text-zinc-300"
                  >
                    {INTERVALS.map((interval) => (
                      <option key={interval.hours} value={interval.hours}>
                        {interval.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      updateAutomation(
                        watch,
                        watch.status === "active" ? "paused" : "active",
                        watch.check_interval_hours ?? 24,
                      )
                    }
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-300"
                  >
                    {watch.status === "active" ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    {automationBusy
                      ? "Saving…"
                      : watch.status === "active"
                        ? "Pause"
                        : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={() => check(watch.id)}
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-300"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${busy === watch.id ? "animate-spin" : ""}`}
                    />
                    Check now
                  </button>
                </div>
              </div>

              {currentEvidence && (
                <div className="mt-3 border-t border-white/[.05] pt-3">
                  <p
                    className={`text-[10px] ${
                      currentEvidence.changed ? "text-amber-300" : "text-emerald-300"
                    }`}
                  >
                    {currentEvidence.first_check
                      ? "Baseline captured"
                      : currentEvidence.changed
                        ? "Public evidence set changed — review required"
                        : "No evidence-set change detected"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentEvidence.sources.slice(0, 4).map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] text-cyan-300/70"
                      >
                        {source.title.slice(0, 42)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
