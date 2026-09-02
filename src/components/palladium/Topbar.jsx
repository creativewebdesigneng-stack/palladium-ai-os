import { Menu, PanelLeftClose, PanelLeftOpen, Search, SunMoon, Bell, HelpCircle, ChevronDown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function Topbar({ collapsed, toggleSidebar, openMobile, openCommand, openAssistant, unread = 0 }) {
  const toggleTheme = () => document.documentElement.classList.toggle('palladium-dim');
  const { user } = useAuth();
  const initials = (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-white/[.07] bg-[#050509]/80 px-4 shadow-[0_10px_40px_rgba(0,0,0,.18)] backdrop-blur-2xl lg:px-6">
      <button onClick={openMobile} aria-label="Open navigation" className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <button onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden rounded-lg p-2 text-zinc-600 transition hover:bg-white/[.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 md:block">
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <button onClick={openCommand} aria-label="Search and command menu" className="group flex h-9 max-w-lg flex-1 items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-sm text-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] transition hover:border-violet-400/20 hover:bg-violet-500/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
        <Search className="h-4 w-4 transition group-hover:text-violet-300" />
        <span className="hidden sm:block">Search Blackstar…</span>
        <span className="block sm:hidden">Search…</span>
        <kbd className="ml-auto hidden rounded-md border border-white/[.08] bg-black/25 px-1.5 py-0.5 text-[10px] text-zinc-600 sm:block">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <div className="mr-2 hidden items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/[.035] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[.16em] text-violet-300/70 xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_8px_rgba(196,181,253,.8)]" />
          Intelligence online
        </div>
        <button onClick={openAssistant} aria-label="AI Assistant" className="hidden rounded-lg p-2 text-zinc-500 transition hover:bg-violet-500/[.06] hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 sm:block">
          <Sparkles className="h-5 w-5" />
        </button>
        <Link to="/help" aria-label="Help" className="hidden rounded-lg p-2 text-zinc-500 transition hover:bg-white/[.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 sm:block">
          <HelpCircle className="h-5 w-5" />
        </Link>
        <button onClick={toggleTheme} aria-label="Toggle dim theme" className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
          <SunMoon className="h-5 w-5" />
        </button>
        <Link to="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} className="relative rounded-lg p-2 text-zinc-500 transition hover:bg-white/[.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[9px] font-semibold text-white ring-2 ring-[#050509]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <Link to="/settings" aria-label="Profile" className="ml-1 flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 transition hover:border-white/[.06] hover:bg-white/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-violet-300/20 bg-gradient-to-br from-[#211536] to-[#08070d] text-xs font-semibold text-violet-100 shadow-[0_0_18px_rgba(124,58,237,.12)]">{initials}</span>
          <ChevronDown className="hidden h-4 w-4 text-zinc-600 lg:block" />
        </Link>
      </div>
    </header>
  );
}
