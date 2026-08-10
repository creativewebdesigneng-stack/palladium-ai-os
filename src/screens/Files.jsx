import { useState } from 'react';
import { Upload, FolderPlus, BookOpen, Library, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import FilesOverviewCards from '@/components/files/FilesOverviewCards';
import FilesSidebar from '@/components/files/FilesSidebar';
import FileGrid from '@/components/files/FileGrid';
import KnowledgeCollectionsGrid from '@/components/files/KnowledgeCollectionsGrid';
import SupportedFileTypes from '@/components/files/SupportedFileTypes';
import DocumentViewer from '@/components/files/DocumentViewer';
import AIKnowledgePanel from '@/components/files/AIKnowledgePanel';
import VectorSearch from '@/components/files/VectorSearch';
import ConnectedStorage from '@/components/files/ConnectedStorage';
import KnowledgeGraph from '@/components/files/KnowledgeGraph';
import AIMemory from '@/components/files/AIMemory';
import FileActivity from '@/components/files/FileActivity';
import SharingPanel from '@/components/files/SharingPanel';
import FilesRightSidebar from '@/components/files/FilesRightSidebar';
import FilesEmptyState from '@/components/files/FilesEmptyState';

const HEAD_ACTIONS = [
  { label: 'Upload Files', icon: Upload, primary: true },
  { label: 'New Folder', icon: FolderPlus },
  { label: 'Import Knowledge', icon: BookOpen },
  { label: 'Create Collection', icon: Library },
  { label: 'Sync Storage', icon: RefreshCw },
];

export default function Files({ file }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [selected, setSelected] = useState(null);

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEAD_ACTIONS.map(a => (
        <button
          key={a.label}
          onClick={() => a.label === 'Upload Files' && setShowEmpty(true)}
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
        <PageHeader eyebrow="Workspace" title="Files & Knowledge" description="Upload files, organise knowledge and give your AI workforce everything it needs to work intelligently." action={headerActions} />
        <FilesEmptyState onStart={() => setShowEmpty(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Files & Knowledge" description="Upload files, organise knowledge and give your AI workforce everything it needs to work intelligently." action={headerActions} />

      {/* Overview */}
      <div className="mb-6"><FilesOverviewCards /></div>

      {/* Main layout: sidebar + content */}
      <div className="grid gap-4 xl:grid-cols-[16rem_1fr_18rem]">
        {/* Left Sidebar */}
        <div className="hidden xl:block">
          <div className="sticky top-6 rounded-2xl border border-white/10 bg-white/[.035] p-3">
            <FilesSidebar active={activeFilter} setActive={setActiveFilter} />
          </div>
        </div>

        {/* Center content */}
        <div className="min-w-0 space-y-5">
          <FileGrid onOpen={setSelected} activeFilter={activeFilter} />
          <KnowledgeCollectionsGrid />
          <SupportedFileTypes />
          <VectorSearch />
          <ConnectedStorage />
          <KnowledgeGraph />
          <AIMemory />
          <div className="grid gap-4 lg:grid-cols-2">
            <FileActivity />
            <SharingPanel />
          </div>
          <AIKnowledgePanel />
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block">
          <div className="sticky top-6"><FilesRightSidebar /></div>
        </div>
      </div>

      {/* Document Viewer Drawer */}
      <DocumentViewer file={selected} onClose={() => setSelected(null)} />
    </>
  );
}