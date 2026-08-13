import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, FolderPlus, Archive } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import ProjectsOverviewCards from '@/components/projects/ProjectsOverviewCards';
import ProjectsToolbar from '@/components/projects/ProjectsToolbar';
import ProjectsFolderGrid from '@/components/projects/ProjectsFolderGrid';
import ProjectsTemplates from '@/components/projects/ProjectsTemplates';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectListRow from '@/components/projects/ProjectListRow';
import ProjectKanban from '@/components/projects/ProjectKanban';
import ProjectTimeline from '@/components/projects/ProjectTimeline';
import ProjectsActivity from '@/components/projects/ProjectsActivity';
import ProjectsCollaboration from '@/components/projects/ProjectsCollaboration';
import ProjectsVersionHistory from '@/components/projects/ProjectsVersionHistory';
import ProjectsDeployments from '@/components/projects/ProjectsDeployments';
import ProjectsRightSidebar from '@/components/projects/ProjectsRightSidebar';
import ProjectsEmptyState from '@/components/projects/ProjectsEmptyState';
import ProjectDetailDrawer from '@/components/projects/ProjectDetailDrawer';
import { PROJECTS } from '@/components/projects/projectsData';

const HEAD_ACTIONS = [
  { label: 'New Project', icon: Plus, primary: true },
  { label: 'Import Project', icon: Upload },
  { label: 'Create Folder', icon: FolderPlus },
  { label: 'Archive', icon: Archive },
];

export default function Projects() {
  const navigate = useNavigate();
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = PROJECTS.filter(p =>
    !query ||
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEAD_ACTIONS.map(a => (
        <button
          key={a.label}
          onClick={() => {
            if (a.label === 'New Project') setShowEmpty(true);
            else if (a.label === 'Import Project') navigate('/version-control');
            else if (a.label === 'Create Folder') document.getElementById('projects-folders')?.scrollIntoView({ behavior: 'smooth' });
            else navigate('/deployments');
          }}
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
        <PageHeader eyebrow="Workspace" title="Projects" description="Manage every AI project, application, automation and workspace from one place." action={headerActions} />
        <ProjectsEmptyState onStart={() => setShowEmpty(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Projects" description="Manage every AI project, application, automation and workspace from one place." action={headerActions} />

      <div className="mb-4"><ProjectsOverviewCards /></div>

      <div className="mb-6"><ProjectsToolbar view={view} setView={setView} query={query} setQuery={setQuery} /></div>

      <div id="projects-folders" className="mb-8"><ProjectsFolderGrid /></div>

      <div className="mb-8"><ProjectsTemplates /></div>

      {/* Project views */}
      <div className="mb-8">
        {view === 'grid' && (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(p => <ProjectCard key={p.id} p={p} onOpen={setSelected} />)}
            </motion.div>
          </AnimatePresence>
        )}
        {view === 'list' && (
          <div className="space-y-2">
            {filtered.map(p => <ProjectListRow key={p.id} p={p} onOpen={setSelected} />)}
          </div>
        )}
        {view === 'kanban' && <ProjectKanban onOpen={setSelected} />}
        {view === 'timeline' && <ProjectTimeline onOpen={setSelected} />}
      </div>

      {/* Content + Right Sidebar */}
      <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ProjectsActivity />
            <ProjectsVersionHistory />
          </div>
          <ProjectsDeployments />
          <ProjectsCollaboration />
        </div>
        <div className="hidden xl:block">
          <div className="sticky top-6"><ProjectsRightSidebar /></div>
        </div>
      </div>

      <ProjectDetailDrawer project={selected} onClose={() => setSelected(null)} />
    </>
  );
}