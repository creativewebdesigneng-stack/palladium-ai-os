import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/palladium/PageHeader';
import JobsToolbar from '@/components/tasks/JobsToolbar';
import TaskListView from '@/components/tasks/TaskListView';
import TaskKanbanView from '@/components/tasks/TaskKanbanView';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import TaskTimelineView from '@/components/tasks/TaskTimelineView';
import TaskDetailDrawer from '@/components/tasks/TaskDetailDrawer';
import { TASKS, STATUSES } from '@/components/tasks/jobsData';

export default function Tasks() {
  const [view, setView] = useState('list');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [open, setOpen] = useState(null);

  const filtered = useMemo(() => {
    let list = TASKS;
    if (status !== 'All') list = list.filter((t) => t.status === status);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q) || t.agent.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q));
    }
    return list;
  }, [query, status]);

  const counts = STATUSES.reduce((acc, s) => { acc[s] = TASKS.filter((t) => t.status === s).length; return acc; }, {});

  return (
    <>
      <PageHeader eyebrow="AI" title="Tasks & Jobs" description="Manage every task given to humans and AI agents." action={
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => (
            <span key={s} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{s} <span className="text-zinc-600">{counts[s]}</span></span>
          ))}
        </div>
      } />

      <JobsToolbar view={view} onView={setView} query={query} onQuery={setQuery} status={status} onStatus={setStatus} onNew={() => setOpen(TASKS[0])} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No tasks match your filters.</div>
      ) : (
        <>
          {view === 'list' && <TaskListView tasks={filtered} onOpen={setOpen} />}
          {view === 'kanban' && <TaskKanbanView tasks={filtered} onOpen={setOpen} />}
          {view === 'calendar' && <TaskCalendarView tasks={filtered} onOpen={setOpen} />}
          {view === 'timeline' && <TaskTimelineView tasks={filtered} onOpen={setOpen} />}
        </>
      )}

      <AnimatePresence>
        {open && <TaskDetailDrawer task={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </>
  );
}