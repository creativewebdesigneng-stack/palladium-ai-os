import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Command, CreditCard, Search } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import Brand from '@/components/palladium/Brand'
import {
  ADMIN_NAV,
  PRIMARY_NAV,
  SYSTEM_GROUPS,
  groupIsActive,
} from '@/components/palladium/navigationData'

function Item({ item, collapsed, closeMobile, end = false, quiet = false }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={end}
      onClick={closeMobile}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `blackstar-nav-item group flex items-center gap-3 rounded-xl px-3 ${quiet ? 'py-2 text-[13px]' : 'py-2.5 text-sm'} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 ${
          isActive ? 'is-active text-white' : quiet ? 'text-zinc-500 hover:text-zinc-100' : 'text-zinc-400 hover:text-white'
        }`
      }
    >
      <Icon className={`${quiet ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

function SystemGroup({ group, pathname, closeMobile }) {
  const active = groupIsActive(group, pathname)
  const Icon = group.icon
  return (
    <details
      key={`${group.id}-${active ? 'active' : 'idle'}`}
      defaultOpen={active}
      className={`blackstar-nav-group group/nav rounded-2xl ${active ? 'is-active' : ''}`}
    >
      <summary className="blackstar-nav-group-summary flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[.06] bg-white/[.025]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{group.label}</span>
          <span className="mt-0.5 block truncate text-[9px] text-zinc-700 group-open/nav:text-zinc-600">{group.description}</span>
        </span>
        <span className="rounded-md border border-white/[.05] bg-black/20 px-1.5 py-0.5 text-[9px] tabular-nums text-zinc-700">{group.items.length}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-700 transition-transform duration-200 group-open/nav:rotate-180" />
      </summary>
      <div className="blackstar-nav-group-items mx-2 mb-2 mt-1 space-y-0.5 border-l border-white/[.055] pl-2">
        {group.items.map((item) => (
          <Item key={item.path} item={item} closeMobile={closeMobile} quiet />
        ))}
      </div>
    </details>
  )
}

function AdminGroup({ pathname, closeMobile }) {
  const active = pathname.startsWith('/admin')
  return (
    <details
      key={`admin-${active ? 'active' : 'idle'}`}
      defaultOpen={active}
      className={`blackstar-nav-group group/nav rounded-2xl ${active ? 'is-active' : ''}`}
    >
      <summary className="blackstar-nav-group-summary flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-violet-300/75 transition hover:text-violet-100">
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-violet-300/10 bg-violet-400/[.035]">
          <Command className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium">Administration</span>
          <span className="mt-0.5 block text-[9px] text-violet-300/30">Platform controls</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-violet-300/35 transition-transform group-open/nav:rotate-180" />
      </summary>
      <div className="mx-2 mb-2 mt-1 space-y-0.5 border-l border-violet-300/10 pl-2">
        {ADMIN_NAV.map((item) => <Item key={item.path} item={item} closeMobile={closeMobile} quiet />)}
      </div>
    </details>
  )
}

export default function Sidebar({ collapsed, mobileOpen, closeMobile, openCommand }) {
  const { user, entitlements } = useAuth()
  const { pathname } = useLocation()
  const isAdmin = user?.role === 'admin'
  const taskLimit = Number(entitlements?.limits?.tasks_per_month ?? 0)
  const tasksUsed = Number(entitlements?.usage?.tasksThisMonth ?? 0)
  const unlimited = taskLimit < 0
  const pct = unlimited || taskLimit === 0 ? 0 : Math.min(100, Math.round((tasksUsed / taskLimit) * 100))

  return (
    <aside
      className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} blackstar-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 md:translate-x-0 ${collapsed ? 'md:w-20' : 'md:w-[17.5rem]'} w-[17.5rem]`}
      aria-label="Primary navigation"
    >
      <div className="relative flex h-[68px] items-center px-5">
        <div aria-hidden className="blackstar-sidebar-brand-glow" />
        <Brand compact={collapsed} />
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={openCommand}
          className={`blackstar-sidebar-command flex w-full items-center rounded-xl border border-white/[.07] bg-white/[.025] text-zinc-500 transition hover:border-violet-300/15 hover:bg-violet-400/[.045] hover:text-zinc-200 ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'}`}
          aria-label="Open Blackstar command search"
          title={collapsed ? 'Search Blackstar' : undefined}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="truncate text-xs">Find anything in Blackstar</span>
              <kbd className="ml-auto rounded-md border border-white/[.06] bg-black/25 px-1.5 py-0.5 text-[9px] text-zinc-700">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-2" aria-label="Main">
        {!collapsed && (
          <p className="px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[.22em] text-zinc-700">
            Command
          </p>
        )}
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.path}>
              <Item item={item} collapsed={collapsed} closeMobile={closeMobile} end={item.path === '/dashboard'} />
            </li>
          ))}
        </ul>

        {!collapsed ? (
          <>
            <div className="my-4 flex items-center gap-2 px-3">
              <span className="text-[9px] font-semibold uppercase tracking-[.22em] text-zinc-700">Systems</span>
              <span className="h-px flex-1 bg-gradient-to-r from-white/[.06] to-transparent" />
            </div>
            <div className="space-y-1">
              {SYSTEM_GROUPS.map((group) => (
                <SystemGroup key={group.id} group={group} pathname={pathname} closeMobile={closeMobile} />
              ))}
              {isAdmin && <AdminGroup pathname={pathname} closeMobile={closeMobile} />}
            </div>
          </>
        ) : (
          <div className="mt-3 border-t border-white/[.055] pt-3">
            <button
              type="button"
              onClick={openCommand}
              className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-white/[.06] bg-white/[.02] text-zinc-600 transition hover:border-violet-300/15 hover:text-violet-200"
              aria-label="Browse all Blackstar systems"
              title="Browse all systems"
            >
              <Command className="h-4 w-4" />
            </button>
          </div>
        )}
      </nav>

      <Link
        to="/billing"
        onClick={closeMobile}
        className="blackstar-usage-card m-3 block rounded-2xl border border-white/[.07] p-3 text-xs text-zinc-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
        aria-label="Plan and usage — open billing"
      >
        {collapsed ? (
          <div className="flex justify-center"><CreditCard className="h-4 w-4 text-violet-400" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-white">{entitlements?.planName ?? 'Explorer'}</p>
              <span className="text-[9px] uppercase tracking-[.16em] text-zinc-700">Usage</span>
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-600">
              {unlimited ? `${tasksUsed.toLocaleString()} tasks · unlimited` : `${tasksUsed.toLocaleString()} / ${taskLimit.toLocaleString()} monthly tasks`}
            </p>
            <div className="mt-2.5 h-1 rounded-full bg-white/[.06]">
              <div className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-sky-400 transition-all" style={{ width: `${unlimited ? 8 : pct}%` }} />
            </div>
          </>
        )}
      </Link>
    </aside>
  )
}
