import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const missionServer = readFileSync(new URL('../mission.server.ts', import.meta.url), 'utf8');
const missionDiscovery = readFileSync(new URL('../mission.discovery.functions.ts', import.meta.url), 'utf8');
const missionScreen = readFileSync(new URL('../../../screens/MissionControl.jsx', import.meta.url), 'utf8');
const metrics = readFileSync(new URL('../../../components/mission/MissionMetrics.jsx', import.meta.url), 'utf8');

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

  it('reports real active-agent state and task outcomes', () => {
    expect(missionScreen).toContain('activeAgentCount');
    expect(missionScreen).toContain('active agents');
    expect(missionScreen).not.toContain('agents online');
    expect(missionScreen).toMatch(/execution\?\.status\s*===\s*'failed'/);
    expect(missionScreen).toMatch(/execution\?\.status\s*===\s*'completed'/);
  });

  it('routes read-only product discovery to Live Explorer before the approval executor', () => {
    expect(missionServer).toContain('commitmentRequested');
    expect(missionServer).toContain('A budget is treated as a filter, not permission to spend money.');
    expect(missionDiscovery).toContain('Read-only/preparation lane');
    expect(missionDiscovery).toContain('requires_approval: false');
    expect(missionDiscovery).not.toContain('approval_requests');
    expect(missionDiscovery).not.toContain('purchase_requests');
    expect(missionScreen).toContain('submitMissionDiscovery');
    expect(missionScreen).toMatch(/discovery\?\.handled\s*\?\s*discovery\s*:\s*submitTaskFn/);
    expect(missionScreen).toMatch(/setTab\(\s*'shopping'\s*\)/);
    expect(missionScreen).toMatch(/\[\s*'shopping'\s*,\s*'Live Explorer'\s*,\s*ShoppingBag\s*\]/);
  });

  it('keeps commitment words on the approval path', () => {
    expect(missionServer).toContain('COMMITMENT_WORDS');
    expect(missionServer).toContain('if (commitmentRequested) tools = [...tools, "checkout"]');
    expect(missionDiscovery).toContain('decision.commitmentRequested');
    expect(missionScreen).toMatch(/setTab\(\s*d\?\.requiresApproval\s*\?\s*'approvals'\s*:\s*'shopping'\s*\)/);
  });

  it('labels mission telemetry according to what the metrics actually count', () => {
    expect(metrics).toContain("label: 'Personal missions'");
    expect(metrics).toContain("label: 'Business missions'");
    expect(metrics).toContain("key: 'runningWorkforceRuns'");
    expect(metrics).toContain("label: 'Intelligence signals'");
  });

  it('wires the live Blackstar command-centre surfaces to the overview', () => {
    expect(missionScreen).toContain('MissionStatusDeck');
    expect(missionScreen).toContain('MissionOperationsCore');
    expect(missionScreen).toContain('AlertsDecisionsRail');
    expect(missionScreen).toContain('ExecutionQueue');
    expect(missionScreen).toContain('ActivityStream');
    expect(missionScreen).toContain("supabase.channel('mission-control')");
    expect(missionScreen).toContain('lastSync');
  });
});
