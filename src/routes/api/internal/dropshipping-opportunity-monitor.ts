import {createFileRoute} from '@tanstack/react-router';
import {processDueDropshippingOpportunityMonitors} from '@/lib/dropshipping/dropshipping-monitor.server';
import {isValidRuntimeWorkerToken} from '@/lib/runtime/runtime-worker-auth.server';

export const Route=createFileRoute('/api/internal/dropshipping-opportunity-monitor')({
  server:{
    handlers:{
      POST:async({request})=>{
        const authorization=request.headers.get('authorization')??'';
        const supplied=authorization.startsWith('Bearer ')?authorization.slice(7):'';
        const verifyFallback=()=>isValidRuntimeWorkerToken('dropshipping_monitor',supplied);
        const execute=async()=>{
          const url=new URL(request.url);
          const requested=Number(url.searchParams.get('limit')??4);
          const limit=Number.isFinite(requested)?Math.max(1,Math.min(8,Math.trunc(requested))):4;
          try{
            const result=await processDueDropshippingOpportunityMonitors(limit);
            return json({ok:true,...result},200);
          }catch(error){
            console.error('[dropshipping-monitor] processing unavailable',{
              errorName:error instanceof Error?error.name:'UnknownError',
            });
            return json({ok:false,error:'Worker unavailable'},503);
          }
        };

        const forwardedAdminKey=request.headers.get('x-blackstar-supabase-secret-key')?.trim()??'';
        if(!forwardedAdminKey){
          if(!(await verifyFallback())) return json({error:'Unauthorized'},401);
          return execute();
        }

        try{
          const {supabaseAdmin,withRequestScopedSupabaseAdminKey}=await import('@/integrations/supabase/client.server');
          return await withRequestScopedSupabaseAdminKey(forwardedAdminKey,async()=>{
            const verified=await supabaseAdmin.rpc('verify_runtime_worker_token',{
              worker_name:'dropshipping_monitor',
              supplied_token:supplied,
            });
            if(verified.error||verified.data!==true) return json({error:'Unauthorized'},401);
            return execute();
          });
        }catch{
          console.error('[runtime-worker] request-scoped database credential rejected',{
            worker:'dropshipping_monitor',
          });
          return json({error:'Runtime worker database credential unavailable'},503);
        }
      },
    },
  },
});

function json(payload:unknown,status:number){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
  });
}
