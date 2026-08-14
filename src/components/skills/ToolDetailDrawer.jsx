import { motion } from 'framer-motion';
import { X, Power } from 'lucide-react';
import { STATUS_STYLE, CATEGORIES } from './skillsData';

export default function ToolDetailDrawer({ tool, onClose, onToggle }) {
  if (!tool) return null;
  const st = STATUS_STYLE[tool.status] ?? STATUS_STYLE.Disabled;
  const cat = CATEGORIES.find((c) => c.id === tool.category);
  const CI = cat?.icon;
  const permissions = tool.permissions ?? [];
  const agentNames = tool.agentNames ?? [];

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0b0c12]">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start gap-2.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-300 ring-1 ring-violet-400/20">{CI && <CI className="h-5 w-5" />}</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">{tool.name}</h2>
              <p className="text-[11px] text-zinc-500">{tool.version ? `v${tool.version} · ` : ''}{tool.category} · {tool.authMethod ?? tool.auth ?? 'No auth'}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-3 text-xs text-zinc-400">{tool.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{tool.status}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{tool.agents ?? 0} agents</span>
            {tool.executable === false && (
              <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">Not executable in this runtime</span>
            )}
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 p-4">
          <button onClick={() => onToggle(tool)} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${tool.status === 'Enabled' ? 'border border-white/10 text-zinc-300 hover:bg-white/5' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'}`}>
            <Power className="h-3.5 w-3.5" />{tool.status === 'Enabled' ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* details */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <Section title="Permissions">
            {permissions.length === 0 ? (
              <p className="text-[11px] text-zinc-500">No permission grants recorded for this tool.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((p) => <span key={p} className="rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 ring-1 ring-violet-400/20">{p}</span>)}
              </div>
            )}
          </Section>

          <Section title="Agents using it">
            {agentNames.length === 0 ? (
              <p className="text-[11px] text-zinc-500">No agents have this tool assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {agentNames.map((n) => (
                  <div key={n} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/20 text-[11px] text-violet-200">{n[0]}</span>
                    <p className="text-xs text-zinc-200">{n}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Configuration">
            <div className="space-y-2">
              <Field label="Slug" value={tool.slug ?? '—'} mono />
              <Field label="Authentication" value={tool.authMethod ?? 'None'} />
              <Field label="Approval required" value={tool.requiresApproval ? 'Yes' : 'No'} />
              <Field
                label="Allowed domains"
                value={(tool.allowedDomains ?? []).length ? tool.allowedDomains.join(', ') : 'None configured'}
                mono
              />
            </div>
          </Section>
        </div>
      </motion.aside>
    </div>
  );
}

function Section({ title, children }) {
  return <div><h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h4>{children}</div>;
}
function Field({ label, value, mono }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={`mt-0.5 break-all text-[11px] text-zinc-300 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}