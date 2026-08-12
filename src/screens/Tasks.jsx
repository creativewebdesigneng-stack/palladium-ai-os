import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, ListChecks } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import JobsToolbar from '@/components/tasks/JobsToolbar';
import TaskListView from '@/components/tasks/TaskListView';
import TaskKanbanView from '@/components/tasks/TaskKanbanView';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import TaskTimelineView from '@/components/tasks/TaskTimelineView';
import TaskDetailDrawer from '@/components/tasks/TaskDetailDrawer';
import { STATUSES } from '@/components/tasks/jobsData';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/hooks/use-workspace';
import { listTasks } from '@/lib/tasks/tasks.functions';

export default function Tasks() {
  const { toast } = useToast();
  const { session } = useWorkspace();
  const [view, setView] = useState('list');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [open, setOpen] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTasks({ data: { limit: 300 } });
      setTasks(res.tasks || []);
    } catch (e) {
      console.error('[tasks]', e);
      setError('We could not load your tasks right now.');
      toast({ title: 'Could not load tasks', description: 'Please try again in a moment.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session !== 'yes') return;
    load();
  }, [session, load]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (status !== 'All') list = list.filter((t) => t.status === status);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.project || '').toLowerCase().includes(q) ||
        (t.agent || '').toLowerCase().includes(q) ||
        (t.owner || '').toLowerCase().includes(q));
    }
    return list;
  }, [tasks, query, status]);

  const counts = STATUSES.reduce((acc, s) => { acc[s] = tasks.filter((t) => t.status === s).length; return acc; }, {});

  return (
    <>
      <PageHeader eyebrow="AI" title="Tasks & Jobs" description="Manage every task given to humans and AI agents." action={
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => (
            <span key={s} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{s} <span className="text-zinc-600">{counts[s]}</span></span>
          ))}
        </div>
      } />

      <JobsToolbar view={view} onView={setView} query={query} onQuery={setQuery} status={status} onStatus={setStatus} onNew={() => toast({ title: 'Create a task from Mission Control', description: 'New tasks are submitted from your agent workspace.' })} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-16 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-rose-400/20 bg-rose-400/5 p-12 text-center text-sm text-rose-300">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">
          <ListChecks className="mx-auto mb-3 h-6 w-6 text-zinc-600" />
          {tasks.length === 0 ? 'No tasks yet. Ask an agent to do something from Mission Control to see it here.' : 'No tasks match your filters.'}
        </div>
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
