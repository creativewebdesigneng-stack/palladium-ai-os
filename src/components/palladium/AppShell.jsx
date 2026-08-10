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

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [command, setCommand] = useState(false);
  const [assistantPanel, setAssistantPanel] = useState(false);

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
    <div className="relative min-h-screen text-zinc-100">
      <div aria-hidden className="fixed inset-0 -z-20 bg-[#0a0b11]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-60"><SpaceBackground intensity="subtle" /></div>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
      <div className={`transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <Topbar
          collapsed={collapsed}
          toggleSidebar={() => setCollapsed((c) => !c)}
          openMobile={() => setMobileOpen(true)}
          openCommand={() => setCommand(true)}
          openAssistant={() => setAssistantPanel(true)}
        />
        <main className="relative mx-auto max-w-[1600px] p-4 lg:p-6">
          <PageTransition><Outlet /></PageTransition>
        </main>
      </div>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/60 md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <CommandMenu open={command} onClose={() => setCommand(false)} />
      <GlobalAIAssistant open={assistantPanel} onOpenChange={setAssistantPanel} />
      <UpgradeModal />
    </div>
    </UpgradeProvider>
  );
}