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
      <div className="relative min-h-screen overflow-x-hidden bg-[#030306] text-zinc-100">
        <div aria-hidden className="fixed inset-0 -z-30 bg-[#030306]" />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 opacity-45">
          <SpaceBackground intensity="subtle" />
        </div>
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_72%_8%,rgba(124,58,237,.10),transparent_26%),radial-gradient(circle_at_30%_90%,rgba(99,102,241,.06),transparent_30%)]" />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />

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
          <main className="relative mx-auto max-w-[1680px] p-4 lg:p-7 xl:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-32 bg-gradient-to-b from-violet-500/[.025] to-transparent blur-3xl" />
            <PageTransition><Outlet /></PageTransition>
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
