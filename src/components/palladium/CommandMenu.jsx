import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerFn } from '@tanstack/react-start';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CornerDownLeft, ArrowUp, ArrowDown, Command, Home, FolderKanban,
  Users, Bot, ListChecks, Workflow, Files, BookOpen, Plug, Store, Globe,
  Wrench, Code2, BarChart3, Bell, LifeBuoy, Settings, ShieldCheck, CreditCard,
  Cpu, Lock, Loader2, Zap,
} from 'lucide-react';
import { searchWorkspace } from '@/lib/search/search.functions';

const PAGES = [
  ['Home', '/dashboard', Home],
  ['Fast Track', '/fast-track', Zap],
  ['Projects', '/projects', FolderKanban],
  ['AI Workforce', '/workforce', Users],
  ['Agents', '/agents', Bot],
  ['Tasks', '/tasks', ListChecks],
  ['Workflows', '/workflows', Workflow],
  ['Files', '/files', Files],
  ['Knowledge', '/knowledge', BookOpen],
  ['Integrations', '/integrations', Plug],
  ['Marketplace', '/marketplace', Store],
  ['AI Web', '/web', Globe],
  ['AI Tools', '/ai-tools', Wrench],
  ['Developer', '/developer-workspace', Code2],
  ['Analytics', '/analytics', BarChart3],
  ['Notifications', '/notifications', Bell],
  ['Help', '/help', LifeBuoy],
  ['Settings', '/settings', Settings],
  ['Admin Dashboard', '/admin', ShieldCheck],
  ['Users', '/admin/users', Users],
  ['Subscriptions', '/admin/subscriptions', CreditCard],
  ['Security', '/admin/security', Lock],
  ['System Settings', '/admin/system-settings', Cpu],
];

const QUICK_ACTIONS = [
  { title: 'Open Fast Track', href: '/fast-track', icon: Zap },
  { title: 'Create new project', href: '/projects', icon: FolderKanban },
  { title: 'Create new agent', href: '/agent-builder', icon: Bot },
  { title: 'Create new workflow', href: '/automation', icon: Workflow },
  { title: 'Manage team members', href: '/team', icon: Users },
];

const RESOURCE_ICON = {
  project: FolderKanban,
  agent: Bot,
  task: ListChecks,
  workflow: Workflow,
  file: Files,
};

function match(item, q) {
  if (!q) return true;
  const hay = `${item.title} ${item.desc || ''} ${item.type || ''}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((t) => t && hay.includes(t));
}

export default function CommandMenu({ open, onClose }) {
  const navigate = useNavigate();
  const searchFn = useServerFn(searchWorkspace);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [resources, setResources] = useState([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setResources([]);
      setResourceError('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      requestRef.current += 1;
      setResources([]);
      setResourceLoading(false);
      setResourceError('');
      return undefined;
    }

    const requestId = ++requestRef.current;
    setResourceLoading(true);
    setResourceError('');
    const timer = setTimeout(() => {
      searchFn({ data: { query: q, limit: 20 } })
        .then((result) => {
          if (requestId !== requestRef.current) return;
          setResources((result?.results ?? []).map((item) => ({
            ...item,
            icon: RESOURCE_ICON[item.type] ?? Search,
            group: 'Workspace',
          })));
        })
        .catch((error) => {
          if (requestId !== requestRef.current) return;
          console.error('[command-search]', error);
          setResources([]);
          setResourceError('Workspace search is temporarily unavailable.');
        })
        .finally(() => {
          if (requestId === requestRef.current) setResourceLoading(false);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [open, query, searchFn]);

  const groups = useMemo(() => {
    const q = query.trim();
    const pages = PAGES.filter((p) => match({ title: p[0], type: 'Page' }, q)).map(([title, href, icon]) => ({ title, href, icon, group: 'Pages' }));
    const actions = QUICK_ACTIONS.filter((a) => match({ title: a.title, type: 'Action' }, q)).map((a) => ({ ...a, group: 'Actions' }));
    return { pages, resources: q.length >= 2 ? resources : [], actions };
  }, [query, resources]);

  const flat = useMemo(() => [...groups.pages, ...groups.resources, ...groups.actions], [groups]);

  useEffect(() => { setSelected(0); }, [query, resources.length]);

  useEffect(() => {
    if (!open || !flat.length) return;
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected, open, flat.length]);

  const go = (item) => {
    if (!item) return;
    navigate(item.href);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[selected]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  let idx = -1;
  const renderItem = (item) => {
    idx += 1;
    const i = idx;
    const Icon = item.icon;
    const active = i === selected;
    return (
      <button
        key={`${item.group}-${item.id || item.title}-${i}`}
        data-idx={i}
        onMouseMove={() => setSelected(i)}
        onClick={() => go(item)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-violet-500/15 ring-1 ring-violet-400/30' : 'hover:bg-white/5'}`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.04] text-zinc-300">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{item.title}</p>
          <p className="truncate text-[11px] text-zinc-500">{item.subtitle || item.group}</p>
        </div>
        {active && <CornerDownLeft className="h-3.5 w-3.5 text-violet-300" />}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex justify-center bg-black/70 px-4 pt-[10vh] backdrop-blur-md"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#101119] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-5 w-5 text-zinc-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages, projects, agents, tasks, workflows and files…"
                aria-label="Command menu search"
                className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
              {resourceLoading ? <Loader2 className="h-4 w-4 animate-spin text-violet-300" /> : <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 sm:block">ESC</kbd>}
            </div>

            <div ref={listRef} className="min-w-0 flex-1 overflow-y-auto p-3">
              {resourceError && <div className="mb-2 rounded-xl border border-amber-400/15 bg-amber-400/[.05] px-3 py-2 text-[11px] text-amber-200/80">{resourceError}</div>}
              {flat.length === 0 && !resourceLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5"><Search className="h-5 w-5 text-zinc-500" /></span>
                  <p className="mt-3 text-sm font-medium text-white">No results for “{query}”</p>
                  <p className="mt-1 max-w-sm text-xs text-zinc-500">Search checks the workspace records your authenticated account is allowed to read.</p>
                </div>
              ) : (
                <>
                  {groups.pages.length > 0 && <Group label="Pages">{groups.pages.map(renderItem)}</Group>}
                  {groups.resources.length > 0 && <Group label="Workspace">{groups.resources.map(renderItem)}</Group>}
                  {groups.actions.length > 0 && <Group label="Quick Actions">{groups.actions.map(renderItem)}</Group>}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[10px] text-zinc-600">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5"><ArrowUp className="inline h-2.5 w-2.5" /></kbd><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5"><ArrowDown className="inline h-2.5 w-2.5" /></kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5"><CornerDownLeft className="inline h-2.5 w-2.5" /></kbd> open</span>
                <span className="hidden items-center gap-1 sm:flex"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">ESC</kbd> close</span>
              </div>
              <span className="flex items-center gap-1"><Command className="h-3 w-3" /> PalladiumAI Command</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({ label, children }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
