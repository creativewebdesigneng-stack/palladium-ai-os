import {z} from 'zod';
import {supabaseAdmin} from '@/integrations/supabase/client.server';
import {defaultModelFor,isProviderConfigured,resolveAssistantModelPreference} from '@/lib/ai/ai-preferences.server';
import {searchPublicWeb} from '@/lib/ai/web-access.server';
import {notifyWithOutcome} from '@/lib/notifications/notify.server';
import {runChat,type ChatMessage,type Provider} from '@/lib/runtime/model-gateway.server';
import {calculateWatchlistScore,normalizeOpportunityEvidence,watchlistBand} from './dropshipping-opportunities';

type Sb={from:(table:string)=>any};
type Opportunity={
  id:string;
  user_id:string;
  workspace_id?:string|null;
  kind?:string|null;
  status?:string|null;
  title:string;
  niche?:string|null;
  market?:string|null;
  channel?:string|null;
  opportunity_score?:number|null;
  demand_score?:number|null;
  search_momentum?:number|null;
  competition_score?:number|null;
  margin_score?:number|null;
  supplier_score?:number|null;
  compliance_risk?:number|null;
  evidence_urls?:unknown;
  notes?:string|null;
  last_checked_at?:string|null;
  monitor_enabled?:boolean;
  monitor_interval_hours?:number|null;
  next_check_at?:string|null;
  claimed_at?:string|null;
  monitor_attempts?:number|null;
};

const scoringSchema=z.object({
  demand_score:z.number().min(0).max(100),
  search_momentum:z.number().min(0).max(100),
  competition_score:z.number().min(0).max(100),
  margin_score:z.number().min(0).max(100),
  supplier_score:z.number().min(0).max(100),
  compliance_risk:z.number().min(0).max(100),
  confidence:z.enum(['low','medium','high']),
  rationale:z.string().trim().min(1).max(4000),
});

function clampLimit(value:number,max=8){
  return Number.isFinite(value)?Math.max(1,Math.min(max,Math.trunc(value))):1;
}
function safeJson(text:string){
  const start=text.indexOf('{');
  const end=text.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('Monitor model did not return JSON.');
  return JSON.parse(text.slice(start,end+1));
}
function nextCheck(intervalHours:number){
  const hours=Math.max(1,Math.min(168,Number(intervalHours)||24));
  return new Date(Date.now()+hours*3_600_000).toISOString();
}
function promptFor(row:Opportunity,sources:Array<{title:string;url:string;snippet?:string}>){
  const evidence=sources.map((source,index)=>`[${index+1}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet??''}`).join('\n\n');
  return [
    'Score this saved dropshipping opportunity using ONLY the supplied live web evidence and the saved context.',
    'Return one JSON object and nothing else with numeric fields demand_score, search_momentum, competition_score, margin_score, supplier_score, compliance_risk (0-100), confidence (low|medium|high), and rationale.',
    'Do not invent sales volume, search volume, supplier stock, costs or marketplace facts. Penalise uncertainty in the relevant score and explain it in rationale.',
    `Opportunity: ${row.title}`,
    row.kind?`Kind: ${row.kind}`:'',
    row.niche?`Niche: ${row.niche}`:'',
    row.market?`Market: ${row.market}`:'',
    row.channel?`Channel: ${row.channel}`:'',
    row.notes?`Saved notes: ${String(row.notes).slice(0,1500)}`:'',
    'LIVE WEB EVIDENCE:',
    evidence,
  ].filter(Boolean).join('\n\n');
}

async function chooseModel(sb:Sb,userId:string){
  let preference:null|{default_provider?:unknown;default_model?:unknown}=null;
  try{
    const result=await sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',userId).maybeSingle();
    if(!result.error)preference=result.data;
  }catch{}
  return resolveAssistantModelPreference(preference);
}

async function scoreOpportunity(sb:Sb,row:Opportunity,sources:Array<{title:string;url:string;snippet?:string}>){
  const selected=await chooseModel(sb,row.user_id);
  const messages:ChatMessage[]=[
    {role:'system',content:'You are Blackstar Dropshipping Market Monitor. Return strict JSON only. Use supplied evidence, distinguish uncertainty from fact, and never fabricate metrics.'},
    {role:'user',content:promptFor(row,sources)},
  ];
  let provider=selected.provider as Provider;
  let model=selected.model;
  try{
    const result=await runChat({provider,model,messages,maxTokens:900});
    return {scores:scoringSchema.parse(safeJson(result.text)),provider:result.provider,model:result.model};
  }catch(primary){
    if(provider==='groq'||!isProviderConfigured('groq'))throw primary;
    provider='groq';
    model=defaultModelFor('groq');
    const fallback=await runChat({provider,model,messages,maxTokens:900});
    return {scores:scoringSchema.parse(safeJson(fallback.text)),provider:fallback.provider,model:fallback.model};
  }
}

async function runMonitorCheck(sb:Sb,row:Opportunity){
  const query=[
    `Current dropshipping market evidence for ${row.title}`,
    row.niche?`in ${row.niche}`:'',
    row.market?`for ${row.market}`:'',
    row.channel?`on ${row.channel}`:'',
    'demand search trend competition pricing supplier delivery returns policy risk',
  ].filter(Boolean).join(' ').slice(0,600);
  const search=await searchPublicWeb(query,8);
  if(!search.results.length)throw new Error('No live web evidence was found for this opportunity.');

  const model=await scoreOpportunity(sb,row,search.results);
  const s=model.scores;
  const opportunityScore=calculateWatchlistScore({
    demand:s.demand_score,
    searchMomentum:s.search_momentum,
    competition:s.competition_score,
    margin:s.margin_score,
    supplier:s.supplier_score,
    complianceRisk:s.compliance_risk,
  });
  const evidence=normalizeOpportunityEvidence(search.results.map(source=>({url:source.url,label:source.title})));
  const checkedAt=new Date().toISOString();
  const report=`Confidence: ${s.confidence}. ${s.rationale}`;

  const snapshot=await sb.from('dropshipping_opportunity_snapshots').insert({
    user_id:row.user_id,
    opportunity_id:row.id,
    reason:'ai_recheck',
    opportunity_score:opportunityScore,
    demand_score:s.demand_score,
    search_momentum:s.search_momentum,
    competition_score:s.competition_score,
    margin_score:s.margin_score,
    supplier_score:s.supplier_score,
    compliance_risk:s.compliance_risk,
    evidence_urls:evidence,
    source_count:evidence.length,
    research_report:report,
    checked_at:checkedAt,
  }).select('id').single();
  if(snapshot.error)throw new Error(snapshot.error.message);

  const oldScore=Number(row.opportunity_score??0);
  const oldBand=watchlistBand(oldScore);
  const newBand=watchlistBand(opportunityScore);
  const delta=Math.round((opportunityScore-oldScore)*100)/100;
  const complianceDelta=s.compliance_risk-Number(row.compliance_risk??0);

  const update=await sb.from('dropshipping_opportunities').update({
    opportunity_score:opportunityScore,
    demand_score:s.demand_score,
    search_momentum:s.search_momentum,
    competition_score:s.competition_score,
    margin_score:s.margin_score,
    supplier_score:s.supplier_score,
    compliance_risk:s.compliance_risk,
    evidence_urls:evidence,
    last_checked_at:checkedAt,
    claimed_at:null,
    monitor_attempts:0,
    monitor_last_error:null,
    next_check_at:nextCheck(Number(row.monitor_interval_hours??24)),
    updated_at:checkedAt,
  }).eq('id',row.id).eq('user_id',row.user_id);
  if(update.error)throw new Error(update.error.message);

  if(Math.abs(delta)>=10||oldBand!==newBand||complianceDelta>=20){
    await notifyWithOutcome({
      userId:row.user_id,
      type:'dropshipping.opportunity_movement',
      title:`Dropshipping watchlist movement: ${String(row.title).slice(0,120)}`,
      body:`Score ${oldScore.toFixed(1)} → ${opportunityScore.toFixed(1)} (${delta>=0?'+':''}${delta.toFixed(1)}). Band ${oldBand} → ${newBand}. Compliance risk ${Number(row.compliance_risk??0).toFixed(0)} → ${s.compliance_risk.toFixed(0)}.`,
      link:'/dropshipping-hub',
      metadata:{opportunity_id:row.id,old_score:oldScore,new_score:opportunityScore,old_band:oldBand,new_band:newBand,confidence:s.confidence,source_count:evidence.length},
    });
  }
  return {id:row.id,score:opportunityScore,delta,band:newBand,sources:evidence.length,provider:model.provider,model:model.model};
}

export async function processDueDropshippingOpportunityMonitors(limit=4){
  const sb=supabaseAdmin as unknown as Sb;
  const now=new Date();
  const nowIso=now.toISOString();
  const staleClaim=new Date(now.getTime()-20*60_000).toISOString();
  await sb.from('dropshipping_opportunities')
    .update({claimed_at:null,updated_at:nowIso})
    .eq('monitor_enabled',true)
    .lt('claimed_at',staleClaim);

  const due=await sb.from('dropshipping_opportunities')
    .select('id,user_id,workspace_id,kind,status,title,niche,market,channel,opportunity_score,demand_score,search_momentum,competition_score,margin_score,supplier_score,compliance_risk,evidence_urls,notes,last_checked_at,monitor_enabled,monitor_interval_hours,next_check_at,claimed_at,monitor_attempts')
    .eq('monitor_enabled',true)
    .in('status',['watching','testing','winner'])
    .lte('next_check_at',nowIso)
    .is('claimed_at',null)
    .order('next_check_at',{ascending:true})
    .limit(clampLimit(limit,8));
  if(due.error)throw new Error(due.error.message);

  const results:any[]=[];
  let failed=0;
  for(const candidate of due.data??[]){
    const claimTime=new Date().toISOString();
    const attempts=Number(candidate.monitor_attempts??0)+1;
    const claimed=await sb.from('dropshipping_opportunities')
      .update({claimed_at:claimTime,monitor_attempts:attempts,monitor_last_error:null,updated_at:claimTime})
      .eq('id',candidate.id).eq('user_id',candidate.user_id)
      .eq('monitor_enabled',true).lte('next_check_at',nowIso).is('claimed_at',null)
      .select('*').maybeSingle();
    if(claimed.error)throw new Error(claimed.error.message);
    if(!claimed.data)continue;
    try{
      results.push(await runMonitorCheck(sb,claimed.data));
    }catch(error){
      failed+=1;
      const message=error instanceof Error?error.message.slice(0,500):'Opportunity monitor failed.';
      const retryMinutes=Math.min(120,15*Math.max(1,attempts));
      await sb.from('dropshipping_opportunities').update({
        claimed_at:null,
        monitor_last_error:message,
        next_check_at:new Date(Date.now()+retryMinutes*60_000).toISOString(),
        updated_at:new Date().toISOString(),
      }).eq('id',candidate.id).eq('user_id',candidate.user_id);
    }
  }
  return {scanned:due.data?.length??0,checked:results.length,failed,results};
}
