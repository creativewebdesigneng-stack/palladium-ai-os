import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { buildWorkforceOperatingState } from './workforce-os';

type Sb = { from: (table: string) => any };

export const getWorkforceOperatingState = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [workforces, memberships, workflowRuns, fleetAssignments, approvals, identities, passports, delegations] = await Promise.all([
      sb.from('workforces').select('id,status'),
      sb.from('workforce_agents').select('workforce_id,agent_id'),
      sb.from('workflow_runs').select('id,status').order('created_at', { ascending: false }).limit(200),
      sb.from('autonomous_goal_fleet_assignments').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('approval_requests').select('id,status,agent_id').eq('status', 'pending').limit(100),
      sb.from('agent_identities').select('id,agent_id,status').limit(250),
      sb.from('agent_passports').select('id,identity_id,autonomy_tier,risk_tier').limit(250),
      sb.from('agent_delegation_grants').select('id,status,expires_at').limit(250),
    ]);

    const failures = [workforces, memberships, workflowRuns, fleetAssignments, approvals, identities, passports, delegations]
      .map((result: any) => result.error)
      .filter(Boolean);
    if (failures.length) throw new Error('Could not load the complete Workforce OS operating state.');

    return buildWorkforceOperatingState({
      workforces: workforces.data ?? [],
      memberships: memberships.data ?? [],
      workflowRuns: workflowRuns.data ?? [],
      fleetAssignments: fleetAssignments.data ?? [],
      approvals: approvals.data ?? [],
      identities: identities.data ?? [],
      passports: passports.data ?? [],
      delegations: delegations.data ?? [],
    });
  });
