import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { prepareAgentSkillPackage } from './skill-package';
import { AGENT_PROCEDURE_BATCH_SIZE, AGENT_PROCEDURE_PACK_ID, getAgentProcedureBatch } from './agent-procedures-160-pack';

type Sb = { from: (table: string) => any };

/**
 * Install one bounded batch into the existing owner-scoped, RLS-protected
 * agent_skills registry. Respect user skill-name collisions and disabled
 * installed skills; never overwrite an existing user skill or auto-reenable it.
 * Repeated requests safely skip already-installed names.
 */
export const installAgentProcedure160Batch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { start: number }) => ({ start: input?.start }))
  .handler(async ({ data, context }) => {
    const entries = getAgentProcedureBatch(data.start);
    const sb = context.supabase as unknown as Sb;
    const names = entries.map((entry) => entry.name);
    const existing = await sb.from('agent_skills')
      .select('id,name,source_kind,source_ref')
      .eq('user_id', context.userId)
      .in('name', names);
    if (existing.error) throw new Error('Could not inspect existing agent skills.');
    const existingNames = new Map<string, { source_kind: string; source_ref: string | null }>();
    for (const row of existing.data ?? []) existingNames.set(String(row.name).toLowerCase(), row);

    const conflicts: string[] = [];
    const alreadyInstalled: string[] = [];
    const rows: Record<string, unknown>[] = [];
    for (const entry of entries) {
      const previous = existingNames.get(entry.name.toLowerCase());
      if (previous) {
        if (previous.source_kind === 'builtin' && previous.source_ref === entry.sourceRef) alreadyInstalled.push(entry.name);
        else conflicts.push(entry.name);
        continue;
      }
      const prepared = prepareAgentSkillPackage([{ path: 'SKILL.md', content: entry.body }]);
      if (prepared.name !== entry.name || prepared.scan.verdict === 'dangerous' || prepared.requiresTools.length || prepared.requiresScripts.length) {
        throw new Error('The approved agent procedure pack failed security validation.');
      }
      rows.push({
        user_id: context.userId,
        org_id: null,
        name: prepared.name,
        description: prepared.description,
        version: prepared.version,
        body: prepared.body,
        requires_tools: prepared.requiresTools,
        requires_scripts: prepared.requiresScripts,
        dangerous: false,
        scan_verdict: prepared.scan.verdict,
        scan_findings: prepared.scan.findings,
        files: prepared.files,
        source_kind: 'builtin',
        source_ref: entry.sourceRef,
        enabled: prepared.scan.verdict === 'ok',
        updated_at: new Date().toISOString(),
      });
    }

    let installed: Array<{ id: string; name: string }> = [];
    if (rows.length) {
      const result = await sb.from('agent_skills').insert(rows).select('id,name');
      if (result.error || !result.data || result.data.length !== rows.length) {
        throw new Error('Could not install this agent skill batch. Retry the batch to resume safely.');
      }
      installed = result.data;
    }
    if (installed.length) {
      const audit = await sb.from('mission_audit_logs').insert({
        user_id: context.userId,
        action: 'agent_skill_procedure_pack_batch_installed',
        target_type: 'agent_skill_pack',
        target_id: null,
        status: 'success',
        metadata: { pack: AGENT_PROCEDURE_PACK_ID, start: data.start, installed_names: installed.map((item) => item.name), count: installed.length },
      });
      if (audit.error) throw new Error('The skill batch was installed, but its audit entry could not be recorded. Retry to reconcile and review the ledger.');
    }

    return {
      start: data.start,
      nextStart: data.start + AGENT_PROCEDURE_BATCH_SIZE < 160 ? data.start + AGENT_PROCEDURE_BATCH_SIZE : null,
      added: installed.length,
      alreadyInstalled: alreadyInstalled.length,
      conflicts,
      packSize: 160,
    };
  });
