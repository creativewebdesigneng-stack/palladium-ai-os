import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isSignedIn } from '@/lib/authUiState';

function Mark() {
  return (
    <span className="blackstar-brand-core relative grid h-10 w-10 shrink-0 place-items-center" aria-hidden="true">
      <span className="blackstar-brand-orbit blackstar-brand-orbit-one" />
      <span className="blackstar-brand-orbit blackstar-brand-orbit-two" />
      <span className="blackstar-brand-center" />
      <span className="blackstar-brand-cross blackstar-brand-cross-a" />
      <span className="blackstar-brand-cross blackstar-brand-cross-b" />
    </span>
  );
}

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, authChecked, user, logout } = useAuth();
  const signedIn = isSignedIn({ authChecked, isAuthenticated });
  const initials = (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();
  const links = [
    ['Platform', '/features'],
    ['Agents', '/ai-agents'],
    ['Intelligence Hub', '/tools'],
    ['Enterprise', '/business'],
    ['Developers', '/developers'],
    ['Resources', '/resources'],
    ['Pricing', '/pricing'],
  ];

  return (
    <header className="blackstar-public-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="Blackstar home">
          <Mark />
          <span>
            <span className="block text-sm font-semibold tracking-[.18em] text-white">BLACKSTAR</span>
            <span className="hidden text-[7px] font-medium uppercase tracking-[.24em] text-zinc-600 lg:block">Intelligence Infrastructure</span>
          </span>
        </Link>
        <nav className="ml-10 hidden items-center gap-7 text-xs font-medium text-zinc-500 md:flex">
          {links.map(([label, href]) => <a key={label} href={href} className="transition hover:text-violet-100">{label}</a>)}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {signedIn ? (
            <>
              <button onClick={logout} className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:text-white">Sign out</button>
              <Link to="/dashboard" data-testid="nav-dashboard" className="flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-500/[.08] px-4 py-2 text-sm font-medium text-violet-50 shadow-[0_0_24px_rgba(124,58,237,.08)] transition hover:border-violet-300/30 hover:bg-violet-500/[.13]">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-violet-300/20 bg-[#120d1e] text-[10px] font-semibold text-violet-100">{initials}</span>
                Open Blackstar
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-white">Sign in</Link>
              <Link to="/register?returnTo=/pricing" className="rounded-xl border border-violet-300/20 bg-violet-500/[.10] px-4 py-2 text-sm font-medium text-violet-50 shadow-[0_0_24px_rgba(124,58,237,.08)] transition hover:bg-violet-500/[.16]">Launch Blackstar</Link>
            </>
          )}
        </div>
        <button className="ml-auto rounded-lg border border-white/[.08] p-2 text-zinc-300 md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/[.07] bg-[#050509]/96 px-4 py-4 backdrop-blur-2xl md:hidden">
          <nav className="flex flex-col gap-1 text-sm text-zinc-300">
            {links.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/[.04]">{label}</a>)}
          </nav>
          <div className="mt-3 flex gap-2">
            {signedIn ? (
              <>
                <button onClick={() => { setOpen(false); logout(); }} className="flex-1 rounded-lg border border-white/[.08] px-4 py-2 text-center text-sm text-white">Sign out</button>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-violet-300/15 bg-violet-500/[.10] px-4 py-2 text-center text-sm font-medium text-violet-50">Blackstar</Link>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-white/[.08] px-4 py-2 text-center text-sm text-white">Sign in</Link>
                <Link to="/register?returnTo=/pricing" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-violet-300/15 bg-violet-500/[.10] px-4 py-2 text-center text-sm font-medium text-violet-50">Launch</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
