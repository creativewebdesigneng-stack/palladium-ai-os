import { useState } from 'react';
import { ChevronDown, FileText, Bot, Brain, Globe, BookOpen, Cpu, FolderKanban, X } from 'lucide-react';
import { CONTEXT, MODELS } from './chatData';

function Block({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-zinc-200 hover:bg-white/5">
        <Icon className="h-3.5 w-3.5 text-violet-300" />{title}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-zinc-500 transition ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-3 pb-3 text-xs text-zinc-400">{children}</div>}
    </div>
  );
}

export default function ChatContextPanel({ model, onClose }) {
  const c = CONTEXT;
  const m = MODELS.find(x => x.id === model);
  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-white/10 bg-white/[.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <p className="text-xs font-medium text-zinc-200">Context</p>
        <button onClick={onClose} className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-white"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Block icon={Brain} title="Conversation Summary">
          <p className="leading-6">{c.summary}</p>
        </Block>

        <Block icon={FolderKanban} title="Current Project">
          <div className="flex items-center justify-between"><span className="text-white">{c.project.name}</span><span className="text-zinc-500">{c.project.chats} chats</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${c.project.progress}%` }} /></div>
          <p className="mt-1 text-[10px] text-zinc-500">{c.project.progress}% complete</p>
        </Block>

        <Block icon={FileText} title="Attached Files" defaultOpen={false}>
          <div className="space-y-1.5">{c.files.map(f => (
            <div key={f.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"><FileText className="h-3.5 w-3.5 text-zinc-500" /><span className="truncate">{f.name}</span><span className="ml-auto text-[10px] text-zinc-600">{f.size}</span></div>
          ))}</div>
        </Block>

        <Block icon={Bot} title="Running Agents">
          <div className="space-y-2.5">{c.runningAgents.map(a => (
            <div key={a.name}>
              <div className="flex items-center justify-between"><span className="text-white">{a.name}</span><span className="text-[10px] text-zinc-500">{a.progress}%</span></div>
              <p className="text-[11px] text-zinc-500">{a.task}</p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${a.progress}%` }} /></div>
            </div>
          ))}</div>
        </Block>

        <Block icon={Brain} title="Memory" defaultOpen={false}>
          <ul className="list-disc space-y-1 pl-4">{c.memory.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Block>

        <Block icon={Globe} title="Web Results">
          <div className="space-y-2">{c.webResults.map(r => (
            <a key={r.title} href={r.url} className="block rounded-lg border border-white/10 bg-black/20 p-2 hover:bg-white/5">
              <p className="truncate text-white">{r.title}</p>
              <p className="text-[10px] text-zinc-500">{r.src}</p>
            </a>
          ))}</div>
        </Block>

        <Block icon={BookOpen} title="Referenced Documents" defaultOpen={false}>
          <div className="space-y-1.5">{c.referencedDocs.map(d => (
            <div key={d.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"><FileText className="h-3.5 w-3.5 text-zinc-500" /><span className="truncate">{d.name}</span><span className="ml-auto text-[10px] text-zinc-600">p.{d.page}</span></div>
          ))}</div>
        </Block>

        <Block icon={Cpu} title="Model Information">
          <div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${m.grad} text-xs font-semibold text-white`}>{m.letter}</span><div><p className="text-white">{m.name}</p><p className="text-[10px] text-zinc-500">{m.desc}</p></div></div>
          <dl className="mt-3 space-y-1 text-[11px]">
            <div className="flex justify-between"><dt className="text-zinc-500">Context</dt><dd>{c.modelInfo.context}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Speed</dt><dd>{c.modelInfo.speed}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Strength</dt><dd>{c.modelInfo.strength}</dd></div>
          </dl>
        </Block>
      </div>
    </aside>
  );
}