import { NavLink } from 'react-router-dom';
import {
  Home, FolderKanban, Users, Bot, ListChecks, Workflow, Files, BookOpen, Rocket,
  Plug, Store, Globe, Wrench, Code2, BarChart3, Bell, LifeBuoy, Settings, Blocks,
  ShieldCheck, CreditCard, Building2, ScrollText, Activity, Cpu, Lock, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Brand from '@/components/palladium/Brand';

const MAIN = [
  ['Home', '/dashboard', Home],
  ['Projects', '/projects', FolderKanban],
  ['AI Workforce', '/workforce', Users],
  ['Agents', '/agents', Bot],
  ['Tasks', '/tasks', ListChecks],
  ['Workflows', '/workflows', Workflow],
  ['Files', '/files', Files],
  ['Knowledge', '/knowledge', BookOpen],
  ['Integrations', '/integrations', Plug],
  ['Tools Framework', '/tools-framework', Blocks],
  ['Marketplace', '/marketplace', Store],
  ['Creator Hub', '/creator-hub', Rocket],
  ['AI Web', '/web', Globe],
  ['AI Tools', '/ai-tools', Wrench],
  ['Developer', '/developer-workspace', Code2],
  ['Analytics', '/analytics', BarChart3],
];

const BOTTOM = [
  ['Notifications', '/notifications', Bell],
  ['Help', '/help', LifeBuoy],
  ['Settings', '/settings', Settings],
];

const ADMIN = [
  ['Admin Dashboard', '/admin', ShieldCheck],
  ['Users', '/admin/users', Users],
  ['Organisations', '/admin/organisations', Building2],
  ['Subscriptions', '/admin/subscriptions', CreditCard],
  ['Analytics', '/admin/platform-analytics', BarChart3],
  ['Security', '/admin/security', Lock],
  ['Audit Logs', '/admin/audit-logs', ScrollText],
  ['System', '/admin/system-settings', Cpu],
  ['Integrations', '/admin/integrations', Plug],
  ['Marketplace Review', '/admin/marketplace', Store],
];

function Item({ label, path, Icon, collapsed, closeMobile, end }) {
  return (
    <NavLink
      to={path}
      end={end}
      onClick={closeMobile}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 ${
          isActive
            ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20'
            : 'text-zinc-400 hover:bg-white/5 hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(139,92,246,.15)]'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-700 transition group-hover:text-zinc-500" />}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, mobileOpen, closeMobile }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <aside
      className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#090a0f]/95 backdrop-blur-xl transition-all duration-300 md:translate-x-0 ${collapsed ? 'md:w-20' : 'md:w-64'} w-64`}
      aria-label="Primary navigation"
    >
      <div className="flex h-16 items-center px-5">
        <Brand compact={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
        {!collapsed && <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Workspace</p>}
        <ul className="space-y-1">
          {MAIN.map(([label, path, Icon]) => (
            <li key={path}><Item label={label} path={path} Icon={Icon} collapsed={collapsed} closeMobile={closeMobile} end={path === '/dashboard'} /></li>
          ))}
        </ul>

        {!collapsed && <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Account</p>}
        <ul className="space-y-1">
          {BOTTOM.map(([label, path, Icon]) => (
            <li key={path}><Item label={label} path={path} Icon={Icon} collapsed={collapsed} closeMobile={closeMobile} /></li>
          ))}
        </ul>

        {isAdmin && (
          <>
            {!collapsed && <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-500/70">Administration</p>}
            <ul className="space-y-1">
              {ADMIN.map(([label, path, Icon]) => (
                <li key={path}><Item label={label} path={path} Icon={Icon} collapsed={collapsed} closeMobile={closeMobile} /></li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* Upgrade card */}
      <div className="m-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-zinc-400">
        {collapsed ? (
          <div className="flex justify-center"><Activity className="h-4 w-4 text-violet-400" /></div>
        ) : (
          <>
            <p className="font-medium text-white">Pro workspace</p>
            <p className="mt-1">68% of monthly AI credits</p>
            <div className="mt-2 h-1 rounded-full bg-white/10"><div className="h-1 w-2/3 rounded-full bg-violet-500" /></div>
          </>
        )}
      </div>
    </aside>
  );
}