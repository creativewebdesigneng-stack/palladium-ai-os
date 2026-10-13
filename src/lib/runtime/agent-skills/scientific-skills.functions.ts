import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { SCIENTIFIC_SKILL_SOURCES, SCIENTIFIC_SKILLS_COMMIT } from './scientific-skill-sources';
import { fetchPinnedScientificSkill } from './scientific-skills-import.server';
import { scientificSkillSource } from './scientific-skill-sources';

type Sb = { from: (table: string) => any };
const BATCH = 4;

/**
 * Explicit authenticated import into the existing per-user agent_skills registry.
 * No external commands are executed and no new memory, orchestration or approvals
 * infrastructure is created. Sources remain disabled pending manual review.
 *
 * Batches stay bounded for a serverless request; clients can safely resume
 * after errors or reloads from cursor 0 without replacing other user skills.
 */
export const installScientificSkillBatch = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({
    cursor:z.number().int().min(0).max(SCIENTIFIC_SKILL_SOURCES.length).default(0),
  }).parse(input))
  .handler(async ({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const slice=SCIENTIFIC_SKILL_SOURCES.slice(data.cursor,data.cursor+BATCH);
    let inserted=0,existing=0;
    const skipped:Array<{id:string;reason:string}>=[];
    const downloads=await Promise.allSettled(slice.map(async item=>fetchPinnedScientificSkill(item.id)));
    for(let i=0;i<slice.length;i++){
      const item=slice[i]!;
      const resolved=downloads[i]!;
      if(resolved.status==='rejected'){
        skipped.push({id:item.id,reason:resolved.reason instanceof Error
          ?resolved.reason.message.slice(0,180):'Could not verify upstream skill source.'});
        continue;
      }
      const prepared=resolved.value;
      const lookup=await sb.from('agent_skills')
        .select('id,name,source_kind,source_ref,enabled')
        .eq('user_id',context.userId).ilike('name',prepared.name).limit(2);
      if(lookup.error) throw new Error('Could not check your current agent skills.');
      const current=(lookup.data??[]) as Array<Record<string,unknown>>;
      if(current.length>1 || (current.length===1 && current[0]?.['source_ref']!==prepared.sourceRef)){
        skipped.push({id:item.id,reason:'An existing skill uses this name; no user skill was overwritten.'});
        continue;
      }
      if(current.length===1){
        // Keep prior explicit enablement choices, but never preserve enablement
        // if the verified replacement source is marked dangerous.
        const prev=current[0]!;
        const update=await sb.from('agent_skills')
          .update({...prepared.row,enabled:prev['enabled']===true && prepared.scanVerdict!=='dangerous',updated_at:new Date().toISOString()})
          .eq('user_id',context.userId).eq('id',prev['id']).eq('source_ref',prepared.sourceRef)
          .select('id').maybeSingle();
        if(update.error||!update.data) throw new Error('Could not safely update a verified scientific skill.');
        existing++;
      } else {
        const row={...prepared.row,user_id:context.userId,org_id:null,updated_at:new Date().toISOString()};
        const insertedRow=await sb.from('agent_skills').insert(row).select('id').maybeSingle();
        if(insertedRow.error||!insertedRow.data) throw new Error('Could not save a scientific skill to your registry.');
        inserted++;
      }
    }
    await writeAudit({
      userId:context.userId,action:'agent_skill_scientific_archive_batch',
      targetType:'agent_skill_pack',targetId:null,status:'success',
      metadata:{publisher:'K-Dense-AI',commit:SCIENTIFIC_SKILLS_COMMIT,
        cursor:data.cursor,processed:slice.length,inserted,updated:existing,skipped:skipped.length},
    });
    const end=data.cursor+slice.length;
    return {
      inserted,updated:existing,skipped,processed:slice.length,
      total:SCIENTIFIC_SKILL_SOURCES.length,
      nextCursor:end<SCIENTIFIC_SKILL_SOURCES.length?end:null,
      status:'reference-only; user-review required before agents can read imported skill',
    };
  });

/** Preview one verified source without modifying the user's skills or executing scripts. */
export const previewScientificSkill = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({id:z.string().min(1).max(100)}).parse(input))
  .handler(async ({data})=>{
    if(!scientificSkillSource(data.id)) throw new Error('Unknown scientific skill.');
    const prepared=await fetchPinnedScientificSkill(data.id);
    return {
      id:prepared.id,name:prepared.name,description:prepared.description,
      scanVerdict:prepared.scanVerdict,sourceUrl:prepared.sourceUrl,
      sourceRef:prepared.sourceRef,
      preview:String(prepared.row['body']).slice(0,2500),
      note:'Reference playbook only. Additional tools or scientific software are not installed.',
    };
  });
