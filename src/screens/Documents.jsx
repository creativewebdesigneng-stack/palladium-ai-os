import { useState } from 'react';
import { Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import DocumentsToolbar from '@/components/documents/DocumentsToolbar';
import DocumentTypes from '@/components/documents/DocumentTypes';
import AIDocumentsPanel from '@/components/documents/AIDocumentsPanel';
import { RecentView, TemplatesView, SharedView, AIView } from '@/components/documents/DocumentsViews';
import { DISCLAIMER, METRICS } from '@/components/documents/documentsData';

export default function Documents() {
  const [view, setView] = useState('recent');
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const runAction = (id) => {
    setRunning(id);
    setTimeout(() => {
      setRunning(null);
      const labels = { generate: 'Document generated', summarise: 'Document summarised', rewrite: 'Rewrite complete', translate: 'Translation complete', analyse: 'Analysis complete', export: 'Export ready' };
      flash(labels[id]);
    }, 1400);
  };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Documents & Reports" description="Create reports, proposals, contracts, presentations, research, and meeting notes — with AI generation, editing, and multi-format export." action={
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:flex"><Info className="h-3.5 w-3.5 text-zinc-500" />Mock data</div>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>{DISCLAIMER}</p></div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.label}</p>
            <p className="mt-1 text-base font-semibold text-white">{m.value}</p>
            <p className={`text-[10px] ${m.tone}`}>{m.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-4"><DocumentTypes onCreate={(t) => flash(`New ${t} document created`)} /></div>
      <div className="mt-4"><AIDocumentsPanel onRun={runAction} running={running} /></div>
      <div className="mt-4"><DocumentsToolbar view={view} setView={setView} onCreate={() => runAction('generate')} /></div>
      <div className="mt-4">
        {view === 'recent' && <RecentView onOpen={(d) => flash(`Opened: ${d.title}`)} />}
        {view === 'templates' && <TemplatesView onUse={(t) => flash(`Template applied: ${t.title}`)} />}
        {view === 'shared' && <SharedView onOpen={(d) => flash(`Opened: ${d.title}`)} />}
        {view === 'ai' && <AIView onOpen={(d) => flash(`Opened: ${d.title}`)} />}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}