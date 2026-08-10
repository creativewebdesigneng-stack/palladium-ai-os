import { useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import BuilderInput from '@/components/ai-builder/BuilderInput';
import AIActivity from '@/components/ai-builder/AIActivity';
import AIConversation from '@/components/ai-builder/AIConversation';
import LivePreview from '@/components/ai-builder/LivePreview';
import FilesPanel from '@/components/ai-builder/FilesPanel';
import TerminalLogs from '@/components/ai-builder/TerminalLogs';
import VersionHistory from '@/components/ai-builder/VersionHistory';
import { ACTIVITY_STEPS } from '@/components/ai-builder/aiBuilderData';

export default function AIAppBuilder() {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [extra, setExtra] = useState(null);
  const [termLines, setTermLines] = useState(null);

  const handle = (action, text) => {
    if (!text && action === 'generate') text = 'Build a task manager app with a kanban board.';
    setExtra({ role: 'user', text: `[${action}] ${text}` });
    setBusy(true);
    setActive(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i < ACTIVITY_STEPS.length) setActive(i);
      else { clearInterval(t); setBusy(false); setTermLines([{ t: `✓ ${action} complete`, c: 'text-emerald-400' }]); }
    }, 650);
  };

  const rollback = () => setTermLines([{ t: '→ rolled back to v0.3.0', c: 'text-amber-400' }, { t: '✓ preview rebuilt', c: 'text-emerald-400' }]);

  return (
    <>
      <PageHeader eyebrow="Build" title="AI App Builder" description="Describe an idea and let your AI workforce build a live application." />

      <div className="mb-4 space-y-3">
        <BuilderInput onAction={handle} busy={busy} />
        <AIActivity active={active} busy={busy} />
      </div>

      {/* IDE: conversation | preview | files */}
      <div className="grid h-[600px] gap-3 lg:grid-cols-[1fr_1.3fr] xl:grid-cols-[1fr_1.3fr_1fr]">
        <div className="min-h-0"><AIConversation extra={extra} /></div>
        <div className="min-h-0"><LivePreview /></div>
        <div className="min-h-0 hidden xl:block"><FilesPanel /></div>
      </div>

      {/* terminal */}
      <div className="mt-3"><TerminalLogs lines={termLines} /></div>

      {/* version history */}
      <div className="mt-3"><VersionHistory onRollback={rollback} /></div>
    </>
  );
}