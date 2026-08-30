import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { prepareAgentSkillPackage } from './skill-package';
import { INTEGRATION_PLAYBOOKS } from './builtin-integration-playbooks';

type Sb = { from: (table: string) => any };

export const installIntegrationPlaybookPack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const installed: Array<{ id: string; name: string; scan_verdict: string; enabled: boolean }> = [];

    for (const entry of INTEGRATION_PLAYBOOKS) {
      const prepared = prepareAgentSkillPackage([{ path: 'SKILL.md', content: entry.body }]);
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
        enabled: prepared.scan.verdict !== 'dangerous',
        updated_at: new Date().toISOString(),
      };

      const existing = await sb
        .from('agent_skills')
        .select('id')
        .eq('user_id', context.userId)
        .eq('source_kind', 'builtin')
        .eq('source_ref', entry.sourceRef)
        .maybeSingle();

      const result = existing.data
        ? await sb.from('agent_skills').update(row).eq('id', existing.data.id).eq('user_id', context.userId).select('id,name,scan_verdict,enabled').maybeSingle()
        : await sb.from('agent_skills').insert(row).select('id,name,scan_verdict,enabled').maybeSingle();

      if (result.error || !result.data) throw new Error(`Could not install ${entry.name}.`);
      installed.push(result.data);
    }

    await sb.from('mission_audit_logs').insert({
      user_id: context.userId,
      action: 'agent_skill_builtin_pack_installed',
      target_type: 'agent_skill_pack',
      target_id: null,
      status: 'success',
      metadata: {
        pack: '2026-08-30-integration-playbooks',
        count: installed.length,
        sources: ['taste-skill', 'ornith-1', 'raven', 'superplane', 'scout'],
      },
    });

    return { installed, count: installed.length };
  });
