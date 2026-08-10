import { useState } from 'react';
import { Plus, LayoutGrid, Upload, Rocket } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import BuilderPrompt from '@/components/builder/BuilderPrompt';
import BuilderOverviewCards from '@/components/builder/BuilderOverviewCards';
import BuilderPipeline from '@/components/builder/BuilderPipeline';
import BuilderLiveActivity from '@/components/builder/BuilderLiveActivity';
import FileExplorer from '@/components/builder/FileExplorer';
import CodeViewer from '@/components/builder/CodeViewer';
import VisualPreview from '@/components/builder/VisualPreview';
import ComponentLibrary from '@/components/builder/ComponentLibrary';
import DatabaseDesign from '@/components/builder/DatabaseDesign';
import ApiDesign from '@/components/builder/ApiDesign';
import AIWorkforcePanel from '@/components/builder/AIWorkforcePanel';
import BuildLogs from '@/components/builder/BuildLogs';
import ProjectSettings from '@/components/builder/ProjectSettings';
import ProjectTemplates from '@/components/builder/ProjectTemplates';
import RecentProjects from '@/components/builder/RecentProjects';
import BuilderRightSidebar from '@/components/builder/BuilderRightSidebar';
import BuilderEmptyState from '@/components/builder/BuilderEmptyState';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';

const HEAD_ACTIONS = [
  { label: 'New Project', icon: Plus, primary: true },
  { label: 'Templates', icon: LayoutGrid },
  { label: 'Import Project', icon: Upload },
  { label: 'Deploy', icon: Rocket },
];

export default function Builder() {
  const [activeFile, setActiveFile] = useState('App.jsx');
  const [fullscreen, setFullscreen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEAD_ACTIONS.map(a => (
        <button key={a.label} onClick={() => a.label === 'New Project' && setShowEmpty(false)} className={`pbtn ${a.primary ? 'pbtn-primary' : 'pbtn-secondary'} flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${a.primary ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>
          <a.icon className="h-4 w-4" />{a.label}
        </button>
      ))}
    </div>
  );

  if (showEmpty) {
    return (
      <>
        <PageHeader eyebrow="Build" title="AI App Builder" description="Describe your idea and let your AI workforce build it." action={headerActions} />
        <BuilderEmptyState onStart={() => setShowEmpty(false)} />
      </>
    );
  }

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-30"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader eyebrow="Build" title="AI App Builder" description="Describe your idea and let your AI workforce build it." action={headerActions} />

      <BuilderPrompt />
      <div className="mt-4"><BuilderOverviewCards /></div>
      <div className="mt-4"><BuilderPipeline /></div>

      {/* IDE: file explorer + code + preview */}
      <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_1.1fr]">
        <div className="hidden lg:block"><FileExplorer active={activeFile} onSelect={setActiveFile} /></div>
        <div className="min-w-0"><CodeViewer file={activeFile} fullscreen={fullscreen} onToggleFs={() => setFullscreen(f => !f)} /></div>
        <div className="hidden min-w-0 xl:block"><VisualPreview /></div>
      </div>

      {/* Live activity + logs */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BuilderLiveActivity />
        <BuildLogs />
      </div>

      {/* Workforce */}
      <div className="mt-4"><AIWorkforcePanel /></div>

      {/* Component library + database + api */}
      <div className="mt-4 space-y-4">
        <ComponentLibrary />
        <div className="grid gap-4 xl:grid-cols-2">
          <DatabaseDesign />
          <ApiDesign />
        </div>
      </div>

      {/* Settings + templates */}
      <div className="mt-4 space-y-4">
        <ProjectSettings />
        <ProjectTemplates />
        <RecentProjects />
      </div>

      {/* Right sidebar */}
      <div className="mt-4 hidden xl:block"><BuilderRightSidebar /></div>
    </>
  );
}