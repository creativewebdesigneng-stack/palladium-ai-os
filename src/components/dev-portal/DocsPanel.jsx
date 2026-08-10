import { useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { DOCS_NAV, DOCS } from './devPortalData';
import { highlight } from '@/components/dev/highlight';

export default function DocsPanel() {
  const [active, setActive] = useState('authentication');
  const doc = DOCS[active];
  return (
    <div className="flex items-start gap-4">
      <div className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-4 rounded-2xl border border-white/10 bg-white/[.03] p-2">
          <div className="flex items-center gap-2 px-2 py-1.5"><BookOpen className="h-4 w-4 text-violet-400" /><span className="text-xs font-semibold text-white">Documentation</span></div>
          <nav className="mt-1 space-y-0.5">
            {DOCS_NAV.map((n) => (
              <button key={n.id} onClick={() => setActive(n.id)} className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] ${active === n.id ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                <ChevronRight className={`h-3 w-3 transition ${active === n.id ? 'rotate-90' : ''}`} />{n.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-violet-400">Reference</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{doc.title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{doc.desc}</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4">
          <pre className="font-mono text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: highlight(doc.code, active === 'authentication' ? 'js' : 'js') }} />
        </div>
        <ul className="mt-4 space-y-2">
          {doc.points.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />{p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}