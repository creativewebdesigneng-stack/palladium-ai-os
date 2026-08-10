import { useState } from 'react';
import { Plus, LayoutGrid, Upload, Download, Play, Send } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import AutomationOverviewCards from '@/components/automation/AutomationOverviewCards';
import AutomationToolbox from '@/components/automation/AutomationToolbox';
import WorkflowCanvas from '@/components/automation/WorkflowCanvas';
import NodeSettings from '@/components/automation/NodeSettings';
import WorkflowPanel from '@/components/automation/WorkflowPanel';
import RunHistory from '@/components/automation/RunHistory';
import ConditionsLoops from '@/components/automation/ConditionsLoops';
import AIMemory from '@/components/automation/AIMemory';
import HumanApprovals from '@/components/automation/HumanApprovals';
import Monitoring from '@/components/automation/Monitoring';
import WorkflowTemplates from '@/components/automation/WorkflowTemplates';
import RecentWorkflows from '@/components/automation/RecentWorkflows';
import AutomationRightSidebar from '@/components/automation/AutomationRightSidebar';
import AutomationEmptyState from '@/components/automation/AutomationEmptyState';
import AgentBlocks from '@/components/automation/AgentBlocks';
import IntegrationNodes from '@/components/automation/IntegrationNodes';

const HEAD_ACTIONS = [
  { label: 'New Workflow', icon: Plus, primary: true },
  { label: 'Templates', icon: LayoutGrid },
  { label: 'Import', icon: Upload },
  { label: 'Export', icon: Download },
  { label: 'Run', icon: Play },
  { label: 'Publish', icon: Send },
];

export default function AutomationStudio() {
  const [showEmpty, setShowEmpty] = useState(false);

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEAD_ACTIONS.map(a => (
        <button
          key={a.label}
          onClick={() => a.label === 'New Workflow' && setShowEmpty(false)}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${a.primary ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}
        >
          <a.icon className="h-4 w-4" />{a.label}
        </button>
      ))}
    </div>
  );

  if (showEmpty) {
    return (
      <>
        <PageHeader eyebrow="Automate" title="Automation Studio" description="Build powerful AI workflows using drag-and-drop automation." action={headerActions} />
        <AutomationEmptyState onStart={() => setShowEmpty(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Automate" title="Automation Studio" description="Build powerful AI workflows using drag-and-drop automation." action={headerActions} />

      <AutomationOverviewCards />

      {/* Studio: Toolbox | Canvas | NodeSettings */}
      <div className="mt-4 grid gap-3 xl:grid-cols-[210px_1fr] 2xl:grid-cols-[210px_1fr_340px]">
        <div className="hidden h-[524px] xl:block"><AutomationToolbox /></div>
        <div className="min-w-0"><WorkflowCanvas /></div>
        <div className="hidden h-[524px] 2xl:block"><NodeSettings /></div>
      </div>

      {/* Content + Right Sidebar */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          {/* Workflow Panel + Run History */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1"><WorkflowPanel /></div>
            <div className="lg:col-span-2"><RunHistory /></div>
          </div>

          {/* Conditions & Loops */}
          <ConditionsLoops />

          {/* AI Memory + Human Approvals */}
          <div className="grid gap-4 lg:grid-cols-2">
            <AIMemory />
            <HumanApprovals />
          </div>

          {/* Monitoring */}
          <Monitoring />

          {/* AI Agent Blocks */}
          <AgentBlocks />

          {/* Integration Nodes */}
          <IntegrationNodes />

          {/* Templates + Recent */}
          <WorkflowTemplates />
          <RecentWorkflows />
        </div>
        <div className="hidden xl:block">
          <div className="sticky top-6"><AutomationRightSidebar /></div>
        </div>
      </div>
    </>
  );
}