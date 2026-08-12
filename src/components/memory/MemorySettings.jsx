import { useState } from 'react';
import { Settings, Loader2, ShieldCheck } from 'lucide-react';

const TTL_OPTIONS = [
  { label: '2 hours', value: 120 },
  { label: '12 hours', value: 720 },
  { label: '3 days', value: 4320 },
  { label: '7 days', value: 10080 },
];

const RETENTION_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
  { label: 'Forever', value: null },
];

const TOGGLES = [
  {
    key: 'auto_capture',
    label: 'Automatic memory',
    desc: 'Let agents record context from their own runs. Turn this off and only memories you write yourself are kept.',
  },
  {
    key: 'short_term_enabled',
    label: 'Short-term memory',
    desc: 'Recent run context, kept briefly then expired automatically.',
  },
  {
    key: 'long_term_enabled',
    label: 'Long-term memory',
    desc: 'Durable facts and preferences agents may recall in future runs.',
  },
  {
    key: 'document_memory_enabled',
    label: 'Document knowledge',
    desc: 'Allow uploaded documents to be chunked and searched semantically.',
  },
  {
    key: 'organisation_sharing_enabled',
    label: 'Organisation sharing',
    desc: 'Allow agents to write memory that other members of your organisation can read.',
  },
  {
    key: 'capture_sensitive',
    label: 'Allow sensitive detail',
    desc: 'Off by default. While off, health, financial and credential detail is redacted before any automatic memory is stored.',
    caution: true,
  },
];

/**
 * Real memory privacy controls. Every change is written server-side and is what
 * the runtime actually enforces before storing anything automatically.
 */
export default function MemorySettings({ preferences, onSave, saving, disabled }) {
  const [pending, setPending] = useState(null);
  const prefs = pending || preferences;

  if (!prefs) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-zinc-500">
        Loading memory settings…
      </div>
    );
  }

  const commit = (patch) => {
    const next = { ...prefs, ...patch };
    setPending(next);
    Promise.resolve(onSave(patch))
      .catch(() => {})
      .finally(() => setPending(null));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Settings className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Memory settings</h3>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
      </div>
      <p className="mb-3 text-[10px] text-zinc-500">
        These controls are enforced on the server before anything is remembered.
      </p>

      <div className="space-y-3">
        {TOGGLES.map((t) => (
          <div key={t.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-white">
                  {t.label}
                  {t.caution && <ShieldCheck className="h-3 w-3 text-amber-400" />}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{t.desc}</p>
              </div>
              <Toggle
                on={Boolean(prefs[t.key])}
                disabled={disabled}
                onClick={() => commit({ [t.key]: !prefs[t.key] })}
              />
            </div>
          </div>
        ))}

        <Choices
          label="Short-term expiry"
          desc="How long automatically captured run context survives."
          options={TTL_OPTIONS}
          value={prefs.short_term_ttl_minutes}
          disabled={disabled}
          onPick={(value) => commit({ short_term_ttl_minutes: value })}
        />
        <Choices
          label="Long-term retention"
          desc="When durable memories expire on their own."
          options={RETENTION_OPTIONS}
          value={prefs.retention_days ?? null}
          disabled={disabled}
          onPick={(value) => commit({ retention_days: value })}
        />
      </div>
    </div>
  );
}

function Choices({ label, desc, options, value, onPick, disabled }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-medium text-white">{label}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{desc}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            disabled={disabled}
            onClick={() => onPick(o.value)}
            className={`rounded-lg px-2 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
              value === o.value
                ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30'
                : 'border border-white/10 text-zinc-400 hover:bg-white/5'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-white/10'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  );
}
