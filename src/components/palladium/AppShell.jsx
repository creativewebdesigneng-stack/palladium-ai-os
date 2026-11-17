import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/palladium/Sidebar'
import Topbar from '@/components/palladium/Topbar'
import CommandMenu from '@/components/palladium/CommandMenu'
import GlobalAIAssistant from '@/components/palladium/GlobalAIAssistant'
import SpaceBackground from '@/components/visual/SpaceBackground'
import PageTransition from '@/components/visual/PageTransition'
import CommandTheatre from '@/components/mission/CommandTheatre'
import AstraRoomFrame from '@/components/blackstar/AstraRoomFrame'
import BlackstarExperienceField from '@/components/blackstar/BlackstarExperienceField'
import { blackstarRoomForPath, blackstarVisualStyleForPath } from '@/components/blackstar/visualRooms'
import BlackstarRouteErrorBoundary from '@/components/blackstar/BlackstarRouteErrorBoundary'
import PageConnectorGuide from '@/components/integrations/PageConnectorGuide'
import { UpgradeProvider } from '@/lib/upgradeContext'
import UpgradeModal from '@/components/UpgradeModal'
import useRealtimeNotifications from '@/hooks/useRealtimeNotifications'
import { supabase } from '@/integrations/supabase/client'
import '@/components/blackstar/blackstar-astra.css'

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [command, setCommand] = useState(false)
  const [assistantPanel, setAssistantPanel] = useState(false)
  const { unread } = useRealtimeNotifications()
  const { pathname } = useLocation()
  const room = blackstarRoomForPath(pathname)
  const visualStyle = blackstarVisualStyleForPath(pathname)
  const mission = pathname.startsWith('/mission-control')
  const dedicatedWebGL = pathname.startsWith('/game-foundry')

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommand(true) }
      if (e.key === 'Escape') { setCommand(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    let alive = true
    const accents = { violet: '263 70% 58%', cyan: '187 85% 53%', emerald: '158 64% 45%', rose: '347 77% 55%' }
    const apply = (user) => {
      if (!alive || !user) return
      const preferences = user.user_metadata?.blackstar_appearance ?? {}
      const root = document.documentElement
      const accent = accents[preferences.accent] ?? accents.violet
      root.style.setProperty('--primary', accent)
      root.style.setProperty('--ring', accent)
      root.style.setProperty('--sidebar-primary', accent)
      root.style.setProperty('--chart-1', accent)
      root.style.fontSize = preferences.density === 'compact' ? '14px' : '16px'
      document.body.classList.toggle('palladium-dim', Boolean(preferences.dim))
    }
    supabase.auth.getUser().then(({ data }) => apply(data.user)).catch(() => {})
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, user) => apply(user))
    return () => { alive = false; authSub?.subscription?.unsubscribe() }
  }, [])

  const stage = mission ? (
    <CommandTheatre>
      <Outlet />
    </CommandTheatre>
  ) : room !== 'astra-room-default' ? (
    <AstraRoomFrame room={room}>
      <Outlet />
    </AstraRoomFrame>
  ) : (
    <Outlet />
  )

  return (
    <UpgradeProvider>
      <div
        className={`blackstar-shell astra-shell relative min-h-screen overflow-x-hidden bg-[#020204] text-zinc-100 ${room} ${visualStyle}`}
        data-blackstar-style={visualStyle}
      >
        <div aria-hidden className="fixed inset-0 -z-50 bg-[#020204]" />
        <div aria-hidden className={`pointer-events-none fixed inset-0 -z-40 ${mission ? 'opacity-80' : 'opacity-55'}`}>
          <SpaceBackground intensity={mission ? 'medium' : 'low'} />
        </div>
        <div className="fixed inset-0" style={{ zIndex: -35 }}>
          <BlackstarExperienceField
            room={room}
            visualStyle={visualStyle}
            dedicatedWebGL={dedicatedWebGL}
          />
        </div>
        <div aria-hidden className="blackstar-style-atmosphere pointer-events-none fixed inset-0" style={{ zIndex: -15 }} />
        <div aria-hidden className="astra-room-wash pointer-events-none fixed inset-0 -z-10" />

        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} openCommand={() => setCommand(true)} />
        <div className={`transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-[17.5rem]'}`}>
          <Topbar
            collapsed={collapsed}
            toggleSidebar={() => setCollapsed((c) => !c)}
            openMobile={() => setMobileOpen(true)}
            openCommand={() => setCommand(true)}
            openAssistant={() => setAssistantPanel(true)}
            unread={unread}
          />
          <main className={`blackstar-stage relative mx-auto ${mission ? 'max-w-[1920px] p-3 lg:p-5 xl:p-6' : 'max-w-[1740px] p-4 lg:p-7 xl:p-8'}`}>
            <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-40 bg-gradient-to-b from-violet-500/[.035] via-violet-500/[.01] to-transparent blur-3xl" />
            <div aria-hidden className="blackstar-depth-rail blackstar-depth-rail-left" />
            <div aria-hidden className="blackstar-depth-rail blackstar-depth-rail-right" />
            <div className="relative z-10">
              <PageConnectorGuide pathname={pathname} />
              <BlackstarRouteErrorBoundary resetKey={pathname}>
                <PageTransition>{stage}</PageTransition>
              </BlackstarRouteErrorBoundary>
            </div>
          </main>
        </div>
        {mobileOpen && <button className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
        <CommandMenu open={command} onClose={() => setCommand(false)} />
        <GlobalAIAssistant open={assistantPanel} onOpenChange={setAssistantPanel} />
        <UpgradeModal />
      </div>
    </UpgradeProvider>
  )
}
