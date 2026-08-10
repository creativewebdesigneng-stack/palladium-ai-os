import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ShieldAlert, Wand2 } from 'lucide-react';
import {
  PERSONAL_CATEGORIES, AUTONOMY_LEVELS, PERSONALITIES, TOOL_CATALOG,
  DEFAULT_ALLOWED_DOMAINS, ADVISORY_NOTICE,
} from '@/lib/mission/catalog';

const EMPTY = {
  name: '',
  category: 'shopping',
  purpose: '',
  personality: 'Professional',
  instructions: '',
  preferencesText: '',
  budget_limit: '',
  currency: 'GBP',
  allowed_tools: ['web_search'],
  requires_approval: true,
  autonomy: 'prepare',
  schedule: '',
  scope: 'personal',
  allowed_domains: DEFAULT_ALLOWED_DOMAINS.join(', '),
};

export default function AgentBuilder({ open, initial, saving, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY,
      ...(initial ?? {}),
      budget_limit: initial?.budget_limit ?? '',
      allowed_tools: initial?.allowed_tools?.length ? initial.allowed_tools : EMPTY.allowed_tools,
      preferencesText: initial?.preferences ? Object.entries(initial.preferences).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
      allowed_domains: initial?.allowed_domains?.join?.(', ') ?? EMPTY.allowed_domains,
    });
  }, [open, initial]);

  if (!open) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleTool = (id) => setForm((f) => ({
    ...f,
    allowed_tools: f.allowed_tools.includes(id) ? f.allowed_tools.filter((t) => t !== id) : [...f.allowed_tools, id],
  }));

  const forcesApproval = form.allowed_tools.some((t) => ['checkout', 'booking', 'email_draft'].includes(t)) || form.autonomy === 'approval_required';

  const submit = (e) => {
    e.preventDefault();
    const preferences = Object.fromEntries(
      form.preferencesText.split('\n').map((line) => line.split(':')).filter((p) => p.length >= 2 && p[0].trim())
        .map((p) => [p[0].trim(), p.slice(1).join(':').trim()]),
    );
    onSave?.({
      id: initial?.id,
      name: form.name,
      category: form.category,
      purpose: form.purpose,
      personality: form.personality,
      instructions: form.instructions,
      preferences,
      budget_limit: form.budget_limit === '' ? null : Number(form.budget_limit),
      currency: form.currency,
      allowed_tools: form.allowed_tools,
      requires_approval: forcesApproval ? true : form.requires_approval,
      autonomy: form.autonomy,
      schedule: form.schedule,
      scope: form.scope,
      allowed_domains: form.allowed_domains.split(',').map((d) => d.trim()).filter(Boolean),
    });
  };

  const field = 'w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none';
  const label = 'mb-1 block text-[11px] font-medium text-zinc-400';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="my-8 w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0b0c13] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">{initial?.id ? 'Configure agent' : 'Create a personal agent'}</h2>
          <button onClick={onClose} aria-label="Close" className="ml-auto rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="ag-name">Name</label>
              <input id="ag-name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Shopping Assistant" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="ag-cat">Category</label>
              <select id="ag-cat" value={form.category} onChange={(e) => set('category', e.target.value)} className={field}>
                {PERSONAL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {ADVISORY_NOTICE[form.category] && (
            <p className="rounded-xl border border-amber-400/20 bg-amber-500/[.05] p-3 text-[11px] leading-relaxed text-amber-200/90">{ADVISORY_NOTICE[form.category]}</p>
          )}

          <div>
            <label className={label} htmlFor="ag-purpose">Purpose</label>
            <textarea id="ag-purpose" rows={3} value={form.purpose} onChange={(e) => set('purpose', e.target.value)}
              placeholder="Find products matching my requirements, compare options, monitor prices and prepare purchases for my approval." className={field} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="ag-personality">Personality</label>
              <select id="ag-personality" value={form.personality} onChange={(e) => set('personality', e.target.value)} className={field}>
                {PERSONALITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ag-budget">Budget limit (optional)</label>
              <input id="ag-budget" type="number" min="0" step="1" value={form.budget_limit} onChange={(e) => set('budget_limit', e.target.value)} placeholder="250" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="ag-schedule">Schedule</label>
              <select id="ag-schedule" value={form.schedule} onChange={(e) => set('schedule', e.target.value)} className={field}>
                <option value="">On request only</option>
                <option value="Every morning">Every morning</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Hourly">Hourly</option>
              </select>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="ag-instructions">Instructions</label>
            <textarea id="ag-instructions" rows={3} value={form.instructions} onChange={(e) => set('instructions', e.target.value)}
              placeholder="Always compare at least three sellers. Prefer free delivery. Never exceed my budget." className={field} />
          </div>

          <div>
            <label className={label} htmlFor="ag-prefs">Preferences (one per line, e.g. “Preferred retailer: John Lewis”)</label>
            <textarea id="ag-prefs" rows={3} value={form.preferencesText} onChange={(e) => set('preferencesText', e.target.value)} className={field} />
          </div>

          <div>
            <p className={label}>Allowed tools</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {TOOL_CATALOG.map((t) => {
                const on = form.allowed_tools.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => toggleTool(t.id)}
                    className={`flex items-start gap-2 rounded-xl border p-2.5 text-left transition ${on ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-violet-400 bg-violet-500 text-black' : 'border-white/20'}`}>{on ? '✓' : ''}</span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium text-white">{t.label}{t.sensitive && <span className="ml-1 text-[9px] uppercase tracking-wider text-amber-300">approval</span>}</span>
                      <span className="block text-[10px] text-zinc-500">{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="ag-domains">Allowed website domains (allowlist for the browser agent)</label>
            <textarea id="ag-domains" rows={2} value={form.allowed_domains} onChange={(e) => set('allowed_domains', e.target.value)} className={field} />
          </div>

          <div>
            <p className={label}>Autonomy level</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {AUTONOMY_LEVELS.map((l) => (
                <button key={l.id} type="button" onClick={() => set('autonomy', l.id)}
                  className={`rounded-xl border p-2.5 text-left transition ${form.autonomy === l.id ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                  <p className="text-[11px] font-semibold text-white">Level {l.level} — {l.label}</p>
                  <p className="text-[10px] text-zinc-500">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <input type="checkbox" checked={forcesApproval ? true : form.requires_approval} disabled={forcesApproval}
              onChange={(e) => set('requires_approval', e.target.checked)} className="mt-0.5 accent-violet-500" />
            <span className="text-[11px] text-zinc-400">
              Require my approval before any sensitive or external action.
              {forcesApproval && <span className="ml-1 inline-flex items-center gap-1 text-amber-300"><ShieldAlert className="h-3 w-3" />Locked on because this agent can prepare payments, bookings or messages.</span>}
            </span>
          </label>

          <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/[.05] p-3 text-[11px] leading-relaxed text-emerald-200/90">
            This agent can never spend money. It prepares a purchase, shows you the full cost breakdown, and you complete payment yourself through the authorised checkout.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{initial?.id ? 'Save agent' : 'Create agent'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
