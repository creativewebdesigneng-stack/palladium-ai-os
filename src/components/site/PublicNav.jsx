import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isSignedIn } from '@/lib/authUiState';

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, authChecked, user, logout } = useAuth();
  const signedIn = isSignedIn({ authChecked, isAuthenticated });
  const initials = (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();
  const links = [
    ['Features', '/features'],
    ['AI Agents', '/ai-agents'],
    ['AI Tools', '/tools'],
    ['Business', '/business'],
    ['Developers', '/developers'],
    ['Resources', '/resources'],
    ['Help', '/help'],
    ['Pricing', '/pricing'],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090a0f]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="PalladiumAI home">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,.4)]"><Sparkles className="h-4 w-4 text-white" /></span>
          <span className="text-sm font-semibold tracking-tight text-white">Palladium<span className="text-violet-400">AI</span></span>
        </Link>
        <nav className="ml-10 hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          {links.map(([l, h]) => <a key={l} href={h} className="transition hover:text-white hover:drop-shadow-[0_0_6px_rgba(139,92,246,.45)]">{l}</a>)}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {signedIn ? (
            <>
              <button onClick={logout} className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-white">Sign out</button>
              <Link to="/dashboard" data-testid="nav-dashboard" className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-semibold text-white">{initials}</span>
                Go to dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white">Sign in</Link>
              <Link to="/register?returnTo=/pricing" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">Start free trial</Link>
            </>
          )}
        </div>
        <button className="ml-auto rounded-lg border border-white/10 p-2 text-zinc-300 md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#090a0f] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1 text-sm text-zinc-300">
            {links.map(([l, h]) => <a key={l} href={h} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">{l}</a>)}
          </nav>
          <div className="mt-3 flex gap-2">
            {signedIn ? (
              <>
                <button onClick={() => { setOpen(false); logout(); }} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-center text-sm text-white">Sign out</button>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-black">Dashboard</Link>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-center text-sm text-white">Sign in</Link>
                <Link to="/register?returnTo=/pricing" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-black">Start trial</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}