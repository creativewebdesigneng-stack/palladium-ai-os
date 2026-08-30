import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { SEEDREAM_PROMPT_COLLECTIONS } from './builtin-seedream-prompts';

type Sb = { from: (table: string) => any };

export const installSeedreamPromptPack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const installed: Array<{ id: string; name: string; version: number }> = [];

    for (const entry of SEEDREAM_PROMPT_COLLECTIONS) {
      const existing = await sb
        .from('saved_prompts')
        .select('id,version')
        .eq('user_id', context.userId)
        .eq('name', entry.name)
        .maybeSingle();

      if (existing.error) throw new Error(existing.error.message);
      let row: any;
      if (existing.data) {
        const version = Number(existing.data.version ?? 1) + 1;
        const updated = await sb
          .from('saved_prompts')
          .update({
            description: entry.description,
            system_prompt: 'You are using the PalladiumAI Seedream production prompt framework. Preserve exact user text and factual invariants. Never invent brands, URLs, metrics, credentials, certifications or claims.',
            prompt_text: entry.promptText,
            version,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id)
          .eq('user_id', context.userId)
          .select('*')
          .maybeSingle();
        if (updated.error || !updated.data) throw new Error(`Could not update ${entry.name}.`);
        row = updated.data;
      } else {
        const inserted = await sb
          .from('saved_prompts')
          .insert({
            user_id: context.userId,
            name: entry.name,
            description: entry.description,
            system_prompt: 'You are using the PalladiumAI Seedream production prompt framework. Preserve exact user text and factual invariants. Never invent brands, URLs, metrics, credentials, certifications or claims.',
            prompt_text: entry.promptText,
            version: 1,
          })
          .select('*')
          .maybeSingle();
        if (inserted.error || !inserted.data) throw new Error(`Could not install ${entry.name}.`);
        row = inserted.data;
      }

      const snapshot = await sb.from('saved_prompt_versions').insert({
        prompt_id: row.id,
        user_id: context.userId,
        version: row.version,
        name: row.name,
        description: row.description,
        system_prompt: row.system_prompt,
        prompt_text: row.prompt_text,
      });
      if (snapshot.error) throw new Error(snapshot.error.message);
      installed.push({ id: String(row.id), name: String(row.name), version: Number(row.version) });
    }

    await writeAudit({
      userId: context.userId,
      action: 'prompt.seedream_pack_installed',
      targetType: 'prompt_pack',
      targetId: null,
      status: 'success',
      metadata: { collections: installed.length, source: 'awesome-seedream-5-prompts' },
    });

    return { installed, count: installed.length };
  });
