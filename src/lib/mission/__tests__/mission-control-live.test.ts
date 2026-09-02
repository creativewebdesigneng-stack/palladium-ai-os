import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const missionServer = readFileSync(new URL('../mission.server.ts', import.meta.url), 'utf8');
const missionDiscovery = readFileSync(new URL('../mission.discovery.functions.ts', import.meta.url), 'utf8');
const missionScreen = readFileSync(new URL('../../../screens/MissionControl.jsx', import.meta.url), 'utf8');
const commandDeck = readFileSync(new URL('../../../components/mission/BlackstarCommandDeck.jsx', import.meta.url), 'utf8');

describe('Mission Control live wiring', () => {
  it('uses the shared model gateway and Groq fallback for the daily briefing', () => {
    expect(missionServer).toContain('runChat');
    expect(missionServer).toContain('ASSISTANT_PROVIDER');
    expect(missionServer).toContain('GROQ_API_KEY');
    expect(missionServer).toContain('provider: "groq"');
    expect(missionServer).not.toContain('https://ai.gateway.lovable.dev/v1/chat/completions');
  });

  it('uses shared authentication instead of registering another auth listener', () => {
    expect(missionScreen).toContain("useAuth } from '@/lib/AuthContext'");
    expect(missionScreen).toMatch(/const\s*\{\s*isAuthenticated\s*,\s*isLoadingAuth\s*\}\s*=\s*useAuth\(\)/);
    expect(missionScreen).not.toContain('supabase.auth.onAuthStateChange');
    expect(missionScreen).not.toContain('supabase.auth.getSession');
  });

  it('keeps real task outcomes and live mission data wired into the command deck', () => {
    expect(missionScreen).toMatch(/execution\?\.status\s*===\s*'failed'/);
    expect(missionScreen).toMatch(/execution\?\.status\s*===\s*'completed'/);
    expect(missionScreen).toContain('metrics={data?.metrics ?? {}}');
    expect(missionScreen).toContain('approvals={approvals}');
    expect(missionScreen).toContain('notifications={data?.notifications ?? []}');
    expect(missionScreen).toContain('tasks={data?.tasks ?? []}');
    expect(missionScreen).toContain('activities={data?.activities ?? []}');
  });

  it('routes read-only product discovery to Live Explorer before the approval executor', () => {
    expect(missionServer).toContain('commitmentRequested');
    expect(missionServer).toContain('A budget is treated as a filter, not permission to spend money.');
    expect(missionDiscovery).toContain('Read-only/preparation lane');
    expect(missionDiscovery).toContain('requires_approval: false');
    expect(missionDiscovery).not.toContain('approval_requests');
    expect(missionDiscovery).not.toContain('purchase_requests');
    expect(missionScreen).toContain('submitMissionDiscovery');
    expect(missionScreen).toMatch(/if\s*\(discovery\?\.handled\)\s*return\s+discovery/);
    expect(missionScreen).toMatch(/setTab\(\s*'shopping'\s*\)/);
    expect(missionScreen).toMatch(/\[\s*'shopping'\s*,\s*'Live Explorer'\s*,\s*ShoppingBag\s*\]/);
  });

  it('keeps commitment words on the approval path', () => {
    expect(missionServer).toContain('COMMITMENT_WORDS');
    expect(missionServer).toContain('if (commitmentRequested) tools = [...tools, "checkout"]');
    expect(missionDiscovery).toContain('decision.commitmentRequested');
    expect(missionScreen).toMatch(/setTab\(decision\?\.requiresApproval\s*\?\s*'approvals'\s*:\s*'shopping'\)/);
  });

  it('renders the approved full Blackstar command-centre overview', () => {
    expect(missionScreen).toContain("BlackstarCommandDeck from '@/components/mission/BlackstarCommandDeck'");
    expect(missionScreen).toContain('<BlackstarCommandDeck');
    expect(commandDeck).toContain('function HolographicCore');
    expect(commandDeck).toContain('function Heartbeat');
    expect(commandDeck).toContain('function LiveTicker');
    expect(commandDeck).toContain('Live alerts & notifications');
    expect(commandDeck).toContain('System telemetry');
    expect(commandDeck).toContain('Mission execution queue');
    expect(commandDeck).toContain('Live mission feed');
    expect(commandDeck).toContain('Pending approvals');
    expect(commandDeck).toContain('Global infrastructure');
    expect(commandDeck).toContain('System health monitor');
  });

  it('keeps command-centre motion accessible and status-driven', () => {
    expect(commandDeck).toContain('useReducedMotion');
    expect(commandDeck).toContain('rotate: 360');
    expect(commandDeck).toContain("['running', 'in_progress'].includes(task.status)");
    expect(commandDeck).not.toContain('75%');
  });

  it('keeps realtime subscriptions and surfaces fresh notifications on screen', () => {
    expect(missionScreen).toMatch(/\.channel\(\s*'mission-control'\s*\)/);
    expect(missionScreen).toContain("table: 'notifications'");
    expect(missionScreen).toContain('seenNotificationIds');
    expect(missionScreen).toContain('notificationsPrimed');
    expect(missionScreen).toContain("notification.title || 'Blackstar notification'");
    expect(missionScreen).toContain('lastSync');
  });
});
