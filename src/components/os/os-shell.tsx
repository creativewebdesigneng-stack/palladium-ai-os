import { useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Command, Menu, Plus, Search, Sparkles, X } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { navGroups } from "@/lib/os-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="scroll-slim flex-1 space-y-6 overflow-y-auto px-3 pb-6">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="brand-gradient absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full" />
                    )}
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active ? "text-primary" : "group-hover:text-primary",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="glass flex items-center gap-3 rounded-xl p-3">
        <Avatar className="size-8">
          <AvatarFallback className="brand-gradient text-[11px] font-semibold text-primary-foreground">
            JM
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">James Morrow</p>
          <p className="truncate text-[10px] text-muted-foreground">Operator · Enterprise</p>
        </div>
        <span className="size-1.5 shrink-0 animate-pulse-ring rounded-full bg-success" />
      </div>
    </div>
  );
}

export function OsShell({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-0 size-[520px] animate-aurora rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute -right-32 top-1/3 size-[480px] animate-aurora rounded-full bg-violet/10 blur-[140px] [animation-delay:-6s]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[254px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/app">
            <BrandLogo />
          </Link>
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[276px] animate-in slide-in-from-left flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex h-16 items-center justify-between px-5">
              <BrandLogo />
              <button onClick={() => setOpen(false)} aria-label="Close navigation">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                className="grid size-9 place-items-center rounded-lg border border-border lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </button>
            </div>

            <label className="glass flex min-w-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors focus-within:border-primary/50">
              <Search className="size-4 shrink-0" />
              <input
                placeholder="Search missions, agents, departments…"
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="hidden shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] sm:flex">
                <Command className="size-3" />K
              </span>
            </label>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="hero" size="sm" className="hidden sm:inline-flex">
                <Plus className="size-4" /> New mission
              </Button>
              <Link
                to="/app/notifications"
                className="relative grid size-9 place-items-center rounded-lg border border-border transition-colors hover:border-primary/40"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
              </Link>
              <Link
                to="/app/profile"
                className="grid size-9 place-items-center rounded-lg border border-border"
                aria-label="Profile"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="brand-gradient text-[10px] font-semibold text-primary-foreground">
                    JM
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground sm:px-6">
            <Sparkles className="size-3 shrink-0 text-primary" />
            <span className="shrink-0">AI CEO Atlas is orchestrating</span>
            <span className="shrink-0 font-medium text-foreground">12 missions</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 font-medium text-foreground">2,481 agents online</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0">kernel v4.2.1</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
