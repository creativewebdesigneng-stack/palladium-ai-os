import { Menu, PanelLeftClose, PanelLeftOpen, Search, SunMoon, Bell, LifeBuoy, HelpCircle, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function Topbar({ collapsed, toggleSidebar, openMobile, openCommand, openAssistant, unread = 0 }) {
  const toggleTheme = () => document.documentElement.classList.toggle('palladium-dim');
  const { user } = useAuth();
  const initials = (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-white/10 bg-[#0c0d13]/80 px-4 backdrop-blur-xl lg:px-6">
      {/* Mobile menu */}
      <button onClick={openMobile} aria-label="Open navigation" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      {/* Collapse toggle */}
      <button onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 md:block">
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      {/* Search / Command */}
      <button onClick={openCommand} aria-label="Search and command menu" className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm text-zinc-500 transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
        <Search className="h-4 w-4" />
        <span className="hidden sm:block">Search PalladiumAI…</span>
        <span className="block sm:hidden">Search…</span>
        <kbd className="ml-auto hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] sm:block">⌘K</kbd>
      </button>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        <button onClick={openAssistant} aria-label="AI Assistant" className="hidden rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 sm:block">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-white">AI</span>
        </button>
        <Link to="/help" aria-label="Help" className="hidden rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 sm:block">
          <HelpCircle className="h-5 w-5" />
        </Link>
        <button onClick={toggleTheme} aria-label="Toggle dim theme" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
          <SunMoon className="h-5 w-5" />
        </button>
        <Link to="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} className="relative rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[9px] font-semibold text-white ring-2 ring-[#0c0d13]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <Link to="/settings" aria-label="Profile" className="ml-1 flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-semibold text-white">{initials}</span>
          <ChevronDown className="hidden h-4 w-4 text-zinc-500 lg:block" />
        </Link>
      </div>
    </header>
  );
}