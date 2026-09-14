import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {executeIntegrationAction,listIntegrationCapabilities,prepareIntegrationAction} from '@/lib/integrations/agent-integration-runtime.server';
import {assertNoCatalogCredentials,extractDropshippingCatalogCandidates,isDropshippingCatalogReadCapability} from './dropshipping-catalog';

const inputSchema=z.object({provider:z.string().trim().min(1).max(80),action:z.string().trim().min(1).max(160),action_input:z.record(z.string(),z.unknown()).default({})});
const MAX_INPUT_BYTES=32_768,MAX_RESULT_BYTES=1_048_576;

async function safeCapabilities(userId:string,provider:string){
  const rows=await listIntegrationCapabilities(userId,provider);
  return rows.filter(isDropshippingCatalogReadCapability);
}

export const getDropshippingCatalogReadCapabilities=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>z.object({provider:z.string().trim().min(1).max(80)}).parse(value))
  .handler(async({data,context})=>{
    const rows=await safeCapabilities(context.userId,data.provider);
    return rows.map(row=>({provider:row.provider,action:row.action,description:row.description,risk:row.risk,requiresApproval:row.requiresApproval,deployed:row.deployed,inputSchema:row.inputSchema,transport:row.transport,lane:row.lane}));
  });

export const executeDropshippingCatalogRead=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>inputSchema.parse(value))
  .handler(async({data,context})=>{
    const serialized=JSON.stringify(data.action_input);
    if(new TextEncoder().encode(serialized).byteLength>MAX_INPUT_BYTES)throw new Error('Catalog read input exceeds the 32 KB limit.');
    assertNoCatalogCredentials(data.action_input);
    const capabilities=await safeCapabilities(context.userId,data.provider);
    const capability=capabilities.find(row=>row.action===data.action);
    if(!capability)throw new Error('This provider action is not an approved read-only catalog capability.');
    const prepared=await prepareIntegrationAction({userId:context.userId,provider:data.provider,action:data.action,actionInput:data.action_input});
    if(prepared.requiresApproval||prepared.risk!=='low'||!isDropshippingCatalogReadCapability({...capability,...prepared,deployed:true,inputSchema:capability.inputSchema})){
      throw new Error('Catalog Explorer only executes low-risk approval-free product/catalog reads.');
    }
    const result=await executeIntegrationAction({userId:context.userId,provider:prepared.provider,action:prepared.action,actionInput:prepared.input,transport:prepared.transport});
    if(!result.ok)throw new Error(result.error||'Connected catalog read failed.');
    const raw=result.result;
    const rawJson=JSON.stringify(raw);
    if(new TextEncoder().encode(rawJson).byteLength>MAX_RESULT_BYTES)throw new Error('Connected catalog response exceeded the 1 MB safety limit.');
    return {provider:prepared.provider,action:prepared.action,transport:prepared.transport,candidates:extractDropshippingCatalogCandidates(raw,100),rawPreview:rawJson.slice(0,20_000)};
  });
