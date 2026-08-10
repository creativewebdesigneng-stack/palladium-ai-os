import { highlight } from '@/components/dev/highlight';

export default function CodePreview({ file, code, lang, find }) {
  if (!file) return <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm text-zinc-600">Select a file to preview</div>;
  const lines = code.split('\n');
  const html = highlight(code, lang);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/30 px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
        <span className="text-[11px] font-medium text-white">{file}</span>
        <span className="ml-auto text-[10px] text-violet-400">{lang}</span>
      </div>
      <div className="flex flex-1 overflow-auto">
        <div className="select-none py-3 pr-2 pl-3 text-right font-mono text-[11px] leading-[1.6] text-zinc-700">
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre className="flex-1 overflow-x-auto py-3 pr-4 font-mono text-[11px] leading-[1.6]">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </div>
  );
}