import { useState } from 'react';
import { Files, Code2, GitBranch, Sparkles, TriangleAlert, Terminal as TermIcon, Puzzle } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import FileExplorer from '@/components/dev/FileExplorer';
import CodeEditor from '@/components/dev/CodeEditor';
import Terminal from '@/components/dev/Terminal';
import Preview from '@/components/dev/Preview';
import AIAssistant from '@/components/dev/AIAssistant';
import Problems from '@/components/dev/Problems';
import Output from '@/components/dev/Output';
import Git from '@/components/dev/Git';
import Extensions from '@/components/dev/Extensions';
import { FILES } from '@/components/dev/devData';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';

const RIGHT = [
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'problems', label: 'Problems', icon: TriangleAlert },
  { id: 'output', label: 'Output', icon: TermIcon },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'extensions', label: 'Extensions', icon: Puzzle },
];

export default function DeveloperWorkspace() {
  const [active, setActive] = useState(FILES[0].path);
  const [openFiles, setOpenFiles] = useState([FILES[0], FILES[1]]);
  const [right, setRight] = useState('ai');

  const select = (f) => {
    setActive(f.path);
    setOpenFiles((o) => o.some((x) => x.path === f.path) ? o : [...o, f]);
  };
  const close = (path) => {
    const next = openFiles.filter((x) => x.path !== path);
    setOpenFiles(next);
    if (active === path && next[0]) setActive(next[0].path);
  };
  const file = openFiles.find((f) => f.path === active) || openFiles[0];

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-25"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader eyebrow="Workspace" title="Developer Workspace" description="A browser-based development environment with AI assistance — mock only." />

      {/* IDE */}
      <div className="grid h-[600px] gap-3 lg:grid-cols-[210px_1fr_300px]">
        <div className="hidden min-h-0 lg:block"><FileExplorer active={active} onSelect={select} /></div>
        <div className="grid min-h-0 grid-rows-2 gap-3">
          <div className="min-h-0"><CodeEditor openFiles={openFiles} active={active} setActive={setActive} onClose={close} /></div>
          <div className="min-h-0"><Preview /></div>
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
          <div className="flex border-b border-white/10">
            {RIGHT.map((r) => { const I = r.icon; return (
              <button key={r.id} onClick={() => setRight(r.id)} className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-[10px] font-medium ${right === r.id ? 'border-b-2 border-violet-400 text-white' : 'text-zinc-400 hover:text-white'}`}><I className="h-3.5 w-3.5" />{r.label}</button>
            ); })}
          </div>
          <div className="flex-1 overflow-hidden p-3">
            {right === 'ai' && <AIAssistant file={file} />}
            {right === 'problems' && <Problems />}
            {right === 'output' && <Output />}
            {right === 'git' && <Git />}
            {right === 'extensions' && <Extensions />}
          </div>
        </div>
      </div>

      {/* terminal */}
      <div className="mt-3"><Terminal /></div>
    </>
  );
}