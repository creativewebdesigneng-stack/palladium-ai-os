import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/palladium/Sidebar';
import Topbar from '@/components/palladium/Topbar';
import CommandMenu from '@/components/palladium/CommandMenu';
import GlobalAIAssistant from '@/components/palladium/GlobalAIAssistant';
import SpaceBackground from '@/components/visual/SpaceBackground';
import PageTransition from '@/components/visual/PageTransition';
import { UpgradeProvider } from '@/lib/upgradeContext';
import UpgradeModal from '@/components/UpgradeModal';
import useRealtimeNotifications from '@/hooks/useRealtimeNotifications';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [command, setCommand] = useState(false);
  const [assistantPanel, setAssistantPanel] = useState(false);
  const { unread } = useRealtimeNotifications();

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommand(true); }
      if (e.key === 'Escape') { setCommand(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <UpgradeProvider>
      <div className="blackstar-shell relative min-h-screen overflow-x-hidden bg-[#020204] text-zinc-100">
        <div aria-hidden className="fixed inset-0 -z-50 bg-[#020204]" />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-40 opacity-55">
          <SpaceBackground intensity="low" />
        </div>
        <div aria-hidden className="blackstar-spatial-field fixed inset-0 -z-30">
          <span className="blackstar-orb blackstar-orb-a" />
          <span className="blackstar-orb blackstar-orb-b" />
          <span className="blackstar-orb blackstar-orb-c" />
          <span className="blackstar-orbit blackstar-orbit-a" />
          <span className="blackstar-orbit blackstar-orbit-b" />
          <span className="blackstar-horizon" />
        </div>
        <div aria-hidden className="blackstar-perspective-grid pointer-events-none fixed inset-0 -z-20" />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_70%_8%,rgba(139,92,246,.10),transparent_25%),radial-gradient(circle_at_28%_82%,rgba(56,189,248,.045),transparent_28%)]" />

        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
        <div className={`transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
          <Topbar
            collapsed={collapsed}
            toggleSidebar={() => setCollapsed((c) => !c)}
            openMobile={() => setMobileOpen(true)}
            openCommand={() => setCommand(true)}
            openAssistant={() => setAssistantPanel(true)}
            unread={unread}
          />
          <main className="blackstar-stage relative mx-auto max-w-[1740px] p-4 lg:p-7 xl:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-40 bg-gradient-to-b from-violet-500/[.035] via-violet-500/[.01] to-transparent blur-3xl" />
            <div aria-hidden className="blackstar-depth-rail blackstar-depth-rail-left" />
            <div aria-hidden className="blackstar-depth-rail blackstar-depth-rail-right" />
            <div className="relative z-10"><PageTransition><Outlet /></PageTransition></div>
          </main>
        </div>
        {mobileOpen && <button className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
        <CommandMenu open={command} onClose={() => setCommand(false)} />
        <GlobalAIAssistant open={assistantPanel} onOpenChange={setAssistantPanel} />
        <UpgradeModal />
      </div>
    </UpgradeProvider>
  );
}
