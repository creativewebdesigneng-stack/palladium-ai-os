import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { prepareAgentSkillPackage } from './skill-package';
import { AGENT_PROCEDURE_PLAYBOOKS_160 } from './agent-procedure-playbooks';

type Sb = { from: (table: string) => any };
const BATCH_SIZE = 20;

/**
 * Owner-scoped, explicit, resumable install: at most 20 new or updated skills
 * per request. Existing user-created or other-pack skills are NEVER overwritten.
 * Re-running a batch preserves any prior user-disabled state.
 */
export const installAgentProcedurePack160 = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cursor?: number }) => {
    const cursor = input?.cursor ?? 0;
    if (!Number.isInteger(cursor) || cursor < 0 || cursor >= 160 || cursor % BATCH_SIZE !== 0) {
      throw new Error('Invalid skill-pack batch cursor.');
    }
    return { cursor };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const entries = AGENT_PROCEDURE_PLAYBOOKS_160.slice(data.cursor, data.cursor + BATCH_SIZE);
    const { data: existingRows, error: readError } = await sb
      .from('agent_skills')
      .select('id,name,source_kind,source_ref,enabled')
      .eq('user_id', context.userId)
      .limit(1000);
    if (readError) throw new Error('Could not inspect existing agent skills for this workspace.');
    const existingByName = new Map<string, {
      id: string; name: string; source_kind: string; source_ref: string | null; enabled: boolean
    }>((existingRows ?? []).map((item: {
      id: string; name: string; source_kind: string; source_ref: string | null; enabled: boolean
    }) => [item.name.toLowerCase(), item]));

    const newRows: Record<string, unknown>[] = [];
    const updates: Array<{ id: string; row: Record<string, unknown> }> = [];
    const skipped: string[] = [];

    for (const entry of entries) {
      const prepared = prepareAgentSkillPackage([{ path: 'SKILL.md', content: entry.body }]);
      if (prepared.name !== entry.name || prepared.scan.verdict !== 'ok'
        || prepared.requiresTools.length || prepared.requiresScripts.length
        || prepared.requiresProviders.length) {
        throw new Error('Skill pack validation blocked an unsafe or incomplete entry.');
      }
      const existing = existingByName.get(entry.name.toLowerCase());
      if (existing && (existing.source_kind !== 'builtin' || existing.source_ref !== entry.sourceRef)) {
        skipped.push(entry.name);
        continue;
      }
      const row = {
        user_id: context.userId,
        org_id: null,
        name: prepared.name,
        description: prepared.description,
        version: prepared.version,
        body: prepared.body,
        requires_tools: prepared.requiresTools,
        requires_scripts: prepared.requiresScripts,
        dangerous: prepared.dangerous,
        scan_verdict: prepared.scan.verdict,
        scan_findings: prepared.scan.findings,
        files: prepared.files,
        source_kind: 'builtin',
        source_ref: entry.sourceRef,
        enabled: existing ? existing.enabled : true,
        updated_at: new Date().toISOString(),
      };
      if (existing) updates.push({ id: existing.id, row });
      else newRows.push(row);
    }

    if (newRows.length) {
      const inserted = await sb.from('agent_skills').insert(newRows).select('id');
      if (inserted.error || inserted.data?.length !== newRows.length) {
        throw new Error('Could not install this skill batch. Your existing skills were not overwritten.');
      }
    }
    for (const item of updates) {
      const updated = await sb.from('agent_skills').update(item.row)
        .eq('id', item.id).eq('user_id', context.userId).select('id').maybeSingle();
      if (updated.error || !updated.data) throw new Error('Could not update an existing skill in this batch.');
    }

    const nextCursor = data.cursor + BATCH_SIZE;
    const audit = await sb.from('mission_audit_logs').insert({
      user_id: context.userId,
      action: 'agent_skill_procedure_pack_batch_installed',
      target_type: 'agent_skill_pack',
      target_id: null,
      status: 'success',
      metadata: {
        pack: 'blackstar-agent-procedures-160-v1',
        from: data.cursor,
        to: nextCursor,
        inserted: newRows.length,
        updated: updates.length,
        skipped,
      },
    });
    if (audit.error) throw new Error('Skill batch installed but its audit record could not be saved.');

    return {
      processed: entries.length,
      inserted: newRows.length,
      updated: updates.length,
      skipped,
      nextCursor: nextCursor < AGENT_PROCEDURE_PLAYBOOKS_160.length ? nextCursor : null,
      total: AGENT_PROCEDURE_PLAYBOOKS_160.length,
    };
  });
