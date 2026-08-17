import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const missionServer = readFileSync(new URL('../mission.server.ts', import.meta.url), 'utf8');
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
    expect(missionScreen).toContain('const { isAuthenticated, isLoadingAuth } = useAuth()');
    expect(missionScreen).not.toContain('supabase.auth.onAuthStateChange');
    expect(missionScreen).not.toContain('supabase.auth.getSession');
  });

  it('reports real active-agent state and task outcomes', () => {
    expect(missionScreen).toContain('activeAgentCount');
    expect(missionScreen).toContain('active agents');
    expect(missionScreen).not.toContain('agents online');
    expect(missionScreen).toContain("execution?.status === 'failed'");
    expect(missionScreen).toContain("execution?.status === 'completed'");
  });

  it('labels task metrics according to what they actually count', () => {
    expect(metrics).toContain("label: 'Personal tasks'");
    expect(metrics).toContain("label: 'Professional tasks'");
    expect(metrics).toContain("key: 'runningWorkforceRuns'");
    expect(metrics).toContain("label: 'Unread notifications'");
  });
});
