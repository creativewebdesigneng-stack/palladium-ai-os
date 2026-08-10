import { X } from 'lucide-react';
import { highlight } from './highlight';

export default function CodeEditor({ openFiles, active, setActive, onClose }) {
  const file = openFiles.find((f) => f.path === active) || openFiles[0];
  if (!file) return <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm text-zinc-600">No file open</div>;
  const lines = file.code.split('\n');
  const html = highlight(file.code, file.lang);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13]">
      <div className="flex overflow-x-auto border-b border-white/10 bg-black/30">
        {openFiles.map((f) => (
          <div key={f.path} onClick={() => setActive(f.path)} className={`group flex cursor-pointer items-center gap-2 border-r border-white/10 px-3 py-2 text-[11px] ${active === f.path ? 'bg-[#0c0d13] text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />{f.name}
            <button onClick={(e) => { e.stopPropagation(); onClose(f.path); }} className="opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3 text-zinc-500 hover:text-rose-300" /></button>
          </div>
        ))}
      </div>
      <div className="flex flex-1 overflow-auto">
        <div className="select-none py-3 pr-2 pl-3 text-right font-mono text-[11px] leading-[1.6] text-zinc-700">
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre className="flex-1 overflow-x-auto py-3 pr-4 font-mono text-[11px] leading-[1.6]">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 bg-black/30 px-3 py-1 text-[10px] text-zinc-500">
        <span className="text-violet-400">{file.lang}</span><span>UTF-8</span><span>LF</span><span className="ml-auto">{file.path}</span>
      </div>
    </div>
  );
}