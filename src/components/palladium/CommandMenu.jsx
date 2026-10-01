import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useServerFn } from '@tanstack/react-start'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown, ArrowUp, Bot, Command, CornerDownLeft, FolderKanban, Globe,
  ListChecks, Loader2, Search, Store, Users, Workflow, Zap,
} from 'lucide-react'
import { searchWorkspace } from '@/lib/search/search.functions'
import { useAuth } from '@/lib/AuthContext'
import { ADMIN_NAV, ALL_NAV_ITEMS, PRIMARY_NAV } from '@/components/palladium/navigationData'
import { AstraMark } from '@/components/blackstar/AstraMark'

const QUICK_ACTIONS = [
  { title: 'Open Fast Track', href: '/fast-track', icon: Zap, subtitle: 'Start from a goal and let Blackstar route the work' },
  { title: 'Open Mission Control', href: '/mission-control', icon: Globe, subtitle: 'See live work, agents and operational signals' },
  { title: 'Create new project', href: '/projects', icon: FolderKanban, subtitle: 'Start a governed project workspace' },
  { title: 'Create new agent', href: '/agent-builder', icon: Bot, subtitle: 'Build an agent from the existing runtime' },
  { title: 'Create new workflow', href: '/automation', icon: Workflow, subtitle: 'Compose automation with approvals and controls' },
  { title: 'Open Marketplace', href: '/marketplace', icon: Store, subtitle: 'Browse tools and creations' },
  { title: 'Manage team', href: '/team', icon: Users, subtitle: 'Workspace membership and collaboration' },
]

const RESOURCE_ICON = {
  project: FolderKanban,
  agent: Bot,
  task: ListChecks,
  workflow: Workflow,
}

function match(item, q) {
  if (!q) return true
  const hay = `${item.title ?? item.label ?? ''} ${item.desc ?? item.subtitle ?? ''} ${item.type ?? ''} ${item.category ?? ''}`.toLowerCase()
  return q.toLowerCase().split(/\s+/).every((token) => token && hay.includes(token))
}

export default function CommandMenu({ open, onClose }) {
  const navigate = useNavigate()
  const searchFn = useServerFn(searchWorkspace)
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [resources, setResources] = useState([])
  const [resourceLoading, setResourceLoading] = useState(false)
  const [resourceError, setResourceError] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const requestRef = useRef(0)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setResources([])
      setResourceError('')
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) {
      requestRef.current += 1
      setResources([])
      setResourceLoading(false)
      setResourceError('')
      return undefined
    }

    const requestId = ++requestRef.current
    setResourceLoading(true)
    setResourceError('')
    const timer = setTimeout(() => {
      searchFn({ data: { query: q, limit: 20 } })
        .then((result) => {
          if (requestId !== requestRef.current) return
          setResources((result?.results ?? []).map((item) => ({
            ...item,
            icon: RESOURCE_ICON[item.type] ?? Search,
            group: 'Workspace',
          })))
        })
        .catch((error) => {
          if (requestId !== requestRef.current) return
          console.error('[command-search]', error)
          setResources([])
          setResourceError('Workspace search is temporarily unavailable.')
        })
        .finally(() => {
          if (requestId === requestRef.current) setResourceLoading(false)
        })
    }, 180)

    return () => clearTimeout(timer)
  }, [open, query, searchFn])

  const groups = useMemo(() => {
    const q = query.trim()
    const adminPaths = new Set(ADMIN_NAV.map((item) => item.path))
    const source = q ? ALL_NAV_ITEMS : PRIMARY_NAV
    const pages = source
      .filter((item) => isAdmin || !adminPaths.has(item.path))
      .filter((item) => match(item, q))
      .map((item) => ({
        title: item.label,
        href: item.path,
        icon: item.icon,
        group: 'Systems',
        subtitle: item.category ?? 'Blackstar',
      }))

    const actions = QUICK_ACTIONS
      .filter((item) => match(item, q))
      .map((item) => ({ ...item, group: 'Actions' }))

    return {
      pages,
      resources: q.length >= 2 ? resources : [],
      actions: q ? actions : actions.slice(0, 5),
    }
  }, [query, resources, isAdmin])

  const flat = useMemo(() => [...groups.pages, ...groups.resources, ...groups.actions], [groups])

  useEffect(() => { setSelected(0) }, [query, resources.length])

  useEffect(() => {
    if (!open || !flat.length) return
    listRef.current?.querySelector(`[data-idx="${selected}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selected, open, flat.length])

  const go = (item) => {
    if (!item) return
    navigate(item.href)
    onClose()
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((value) => Math.min(value + 1, flat.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((value) => Math.max(value - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(flat[selected])
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  let index = -1
  const renderItem = (item) => {
    index += 1
    const itemIndex = index
    const Icon = item.icon
    const active = itemIndex === selected
    return (
      <button
        key={`${item.group}-${item.id || item.title}-${itemIndex}`}
        data-idx={itemIndex}
        onMouseMove={() => setSelected(itemIndex)}
        onClick={() => go(item)}
        className={`blackstar-command-result flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
          active ? 'is-selected bg-violet-500/10 ring-1 ring-violet-300/20' : 'hover:bg-white/[.035]'
        }`}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.065] bg-white/[.025] text-zinc-400">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{item.title}</p>
          <p className="mt-0.5 truncate text-[10px] text-zinc-600">{item.subtitle || item.group}</p>
        </div>
        {active && <CornerDownLeft className="h-3.5 w-3.5 text-violet-300" />}
      </button>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex justify-center bg-black/72 px-4 pt-[8vh] backdrop-blur-xl"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -18, scale: .975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: .98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="blackstar-command-palette flex h-[76vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-white/[.09] bg-[#07070c]/95 shadow-[0_38px_120px_rgba(0,0,0,.62)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[.065] px-4 sm:px-5">
              <AstraMark size={24} />
              <Search className="h-4 w-4 text-zinc-600" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search systems, projects, agents, tasks, workflows and files…"
                aria-label="Blackstar command search"
                className="h-16 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-700"
              />
              {resourceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
              ) : (
                <kbd className="hidden rounded-lg border border-white/[.07] bg-black/30 px-2 py-1 text-[9px] text-zinc-600 sm:block">ESC</kbd>
              )}
            </div>

            {!query.trim() && (
              <div className="border-b border-white/[.05] px-5 py-3">
                <p className="text-[10px] leading-5 text-zinc-600">
                  Start with a core Blackstar system below, or type to search the full platform and your permitted workspace records.
                </p>
              </div>
            )}

            <div ref={listRef} className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {resourceError && (
                <div className="mb-3 rounded-xl border border-amber-400/15 bg-amber-400/[.05] px-3 py-2 text-[11px] text-amber-200/80">
                  {resourceError}
                </div>
              )}
              {flat.length === 0 && !resourceLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/[.06] bg-white/[.025]">
                    <Search className="h-5 w-5 text-zinc-600" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-white">No results for “{query}”</p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-600">
                    Blackstar only returns systems and workspace records your authenticated account is allowed to read.
                  </p>
                </div>
              ) : (
                <>
                  {groups.pages.length > 0 && <Group label={query.trim() ? 'Blackstar systems' : 'Core systems'}>{groups.pages.map(renderItem)}</Group>}
                  {groups.resources.length > 0 && <Group label="Your workspace">{groups.resources.map(renderItem)}</Group>}
                  {groups.actions.length > 0 && <Group label="Quick actions">{groups.actions.map(renderItem)}</Group>}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[.06] px-4 py-2.5 text-[9px] text-zinc-700 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="rounded border border-white/[.06] bg-white/[.025] px-1 py-0.5"><ArrowUp className="inline h-2.5 w-2.5" /></kbd><kbd className="rounded border border-white/[.06] bg-white/[.025] px-1 py-0.5"><ArrowDown className="inline h-2.5 w-2.5" /></kbd> navigate</span>
                <span className="hidden items-center gap-1 sm:flex"><kbd className="rounded border border-white/[.06] bg-white/[.025] px-1 py-0.5"><CornerDownLeft className="inline h-2.5 w-2.5" /></kbd> open</span>
              </div>
              <span className="flex items-center gap-1.5 uppercase tracking-[.14em]"><Command className="h-3 w-3" /> Blackstar Command</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Group({ label, children }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-zinc-700">{label}</p>
        <span className="h-px flex-1 bg-gradient-to-r from-white/[.05] to-transparent" />
      </div>
      <div className="grid gap-1 md:grid-cols-2">{children}</div>
    </div>
  )
}
