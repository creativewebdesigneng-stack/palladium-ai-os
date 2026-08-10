import { useState } from 'react';
import { Settings2, Cpu, Wrench, Brain, BookOpen, ShieldCheck, X, Plus, Globe, AppWindow, Code2, SquareTerminal, FileText, Database, Send, Mail, Calendar, Github, MessageSquare, MessagesSquare, Clock, FolderKanban, Users, Folder, Library } from 'lucide-react';
import { SectionTitle, Field, inputCls, Toggle, Pill } from './shared';
import { TOOLS, PROVIDERS, CONTEXT_OPTIONS, REASONING_OPTIONS, MEMORY_TYPES, KNOWLEDGE_SOURCES, ATTACHED, PERMISSIONS } from './builderData';

const SECTIONS = [
  { id: 'config', label: 'Configuration', icon: Settings2 },
  { id: 'model', label: 'Model', icon: Cpu },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
];

const TOOL_ICON_MAP = { web_search: Globe, browser: AppWindow, code: Code2, terminal: SquareTerminal, files: FileText, database: Database, http: Send, email: Mail, calendar: Calendar, github: Github, slack: MessageSquare, discord: MessagesSquare };
const MEM_ICON_MAP = { short: Clock, long: Brain, project: FolderKanban, shared: Users };
const SOURCE_ICON_MAP = { files: FileText, folders: Folder, collections: Library, websites: Globe, databases: Database };

export default function ConfigLeft({ config, update }) {
  const [section, setSection] = useState('config');
  const set = (k, v) => update((c) => ({ ...c, [k]: v }));
  const toggleTool = (id) => set('tools', config.tools.includes(id) ? config.tools.filter((t) => t !== id) : [...config.tools, id]);
  const togglePerm = (id) => set('permissions', config.permissions.includes(id) ? config.permissions.filter((p) => p !== id) : [...config.permissions, id]);
  const toggleMem = (id) => set('memory', config.memory.includes(id) ? config.memory.filter((m) => m !== id) : [...config.memory, id]);

  return (
    <div className="flex h-full min-h-0">
      <div className="w-36 shrink-0 space-y-1 border-r border-white/10 p-2">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition ${section === s.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <s.icon className="h-3.5 w-3.5" />{s.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        {section === 'config' && (
          <div className="space-y-3">
            <SectionTitle icon={Settings2} title="Agent configuration" desc="Define who your agent is." />
            <Field label="Name"><input value={config.name} onChange={(e) => set('name', e.target.value)} placeholder="Research Agent" className={inputCls()} /></Field>
            <Field label="Description"><textarea value={config.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="What does it do?" className={`${inputCls()} resize-none`} /></Field>
            <Field label="Role"><input value={config.role} onChange={(e) => set('role', e.target.value)} placeholder="Market research analyst" className={inputCls()} /></Field>
            <Field label="Personality"><input value={config.personality} onChange={(e) => set('personality', e.target.value)} placeholder="Analytical, concise, helpful" className={inputCls()} /></Field>
            <Field label="Instructions"><textarea value={config.instructions} onChange={(e) => set('instructions', e.target.value)} rows={3} placeholder="Step-by-step guidance…" className={`${inputCls()} resize-none`} /></Field>
            <Field label="Goals"><textarea value={config.goals} onChange={(e) => set('goals', e.target.value)} rows={2} placeholder="One goal per line" className={`${inputCls()} resize-none`} /></Field>
            <Field label="Rules"><textarea value={config.rules} onChange={(e) => set('rules', e.target.value)} rows={2} placeholder="Constraints & guardrails" className={`${inputCls()} resize-none`} /></Field>
          </div>
        )}

        {section === 'model' && (
          <div className="space-y-3">
            <SectionTitle icon={Cpu} title="Model" desc="Pick the brain behind your agent." />
            <Field label="Provider">
              <select value={config.provider} onChange={(e) => { const p = PROVIDERS.find((x) => x.id === e.target.value); set('provider', p.id); set('model', p.models[0]); }} className={inputCls()}>
                {PROVIDERS.map((p) => <option key={p.id} value={p.id} className="bg-[#101119]">{p.label}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select value={config.model} onChange={(e) => set('model', e.target.value)} className={inputCls()}>
                {(PROVIDERS.find((p) => p.id === config.provider)?.models || []).map((m) => <option key={m} value={m} className="bg-[#101119]">{m}</option>)}
              </select>
            </Field>
            <Field label={`Temperature · ${config.temperature.toFixed(2)}`}>
              <input type="range" min={0} max={1} step={0.05} value={config.temperature} onChange={(e) => set('temperature', parseFloat(e.target.value))} className="w-full accent-violet-500" />
              <div className="flex justify-between text-[9px] text-zinc-600"><span>Precise</span><span>Balanced</span><span>Creative</span></div>
            </Field>
            <Field label="Context"><div className="flex flex-wrap gap-1.5">{CONTEXT_OPTIONS.map((c) => <Pill key={c} active={config.context === c} onClick={() => set('context', c)}>{c}</Pill>)}</div></Field>
            <Field label="Reasoning"><div className="flex flex-wrap gap-1.5">{REASONING_OPTIONS.map((r) => <Pill key={r} active={config.reasoning === r} onClick={() => set('reasoning', r)}>{r}</Pill>)}</div></Field>
          </div>
        )}

        {section === 'tools' && (
          <div className="space-y-3">
            <SectionTitle icon={Wrench} title="Tools" desc="What your agent can do." />
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map((t) => {
                const on = config.tools.includes(t.id);
                const I = TOOL_ICON_MAP[t.id] || Wrench;
                return (
                  <button key={t.id} onClick={() => toggleTool(t.id)} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${on ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${t.grad}`}><I className="h-4 w-4 text-white" /></span>
                    <div className="min-w-0"><p className="truncate text-[11px] font-medium text-white">{t.label}</p><p className="truncate text-[9px] text-zinc-500">{t.desc}</p></div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600">{config.tools.length} tool{config.tools.length === 1 ? '' : 's'} enabled</p>
          </div>
        )}

        {section === 'memory' && (
          <div className="space-y-3">
            <SectionTitle icon={Brain} title="Memory" desc="What your agent remembers." />
            {MEMORY_TYPES.map((m) => {
              const I = MEM_ICON_MAP[m.id] || Brain;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5"><I className="h-4 w-4 text-violet-300" /></span>
                  <div className="min-w-0 flex-1"><p className="text-[11px] font-medium text-white">{m.label}</p><p className="text-[10px] text-zinc-500">{m.desc}</p></div>
                  <Toggle checked={config.memory.includes(m.id)} onChange={() => toggleMem(m.id)} />
                </div>
              );
            })}
          </div>
        )}

        {section === 'knowledge' && (
          <div className="space-y-3">
            <SectionTitle icon={BookOpen} title="Knowledge" desc="Attach context for your agent." />
            <div className="flex flex-wrap gap-1.5">{KNOWLEDGE_SOURCES.map((s) => <Pill key={s.id}><Plus className="mr-1 inline h-3 w-3" />{s.label}</Pill>)}</div>
            <p className="pt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">Attached</p>
            <div className="space-y-1.5">
              {ATTACHED.map((a) => {
                const I = SOURCE_ICON_MAP[a.type] || FileText;
                return (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
                    <I className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span className="flex-1 truncate text-[11px] text-zinc-200">{a.label}</span>
                    <button className="text-zinc-600 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section === 'permissions' && (
          <div className="space-y-3">
            <SectionTitle icon={ShieldCheck} title="Permissions" desc="What your agent is allowed to do." />
            {PERMISSIONS.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-white">{p.label}{p.danger && <span className="rounded bg-red-500/15 px-1 text-[8px] font-semibold uppercase text-red-300 ring-1 ring-red-400/20">elevated</span>}</p>
                  <p className="text-[10px] text-zinc-500">{p.desc}</p>
                </div>
                <Toggle checked={config.permissions.includes(p.id)} onChange={() => togglePerm(p.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}