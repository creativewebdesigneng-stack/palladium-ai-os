import {createFileRoute} from '@tanstack/react-router';
import {processDueDropshippingOpportunityMonitors} from '@/lib/dropshipping/dropshipping-monitor.server';
import {isValidRuntimeWorkerToken} from '@/lib/runtime/runtime-worker-auth.server';

export const Route=createFileRoute('/api/internal/dropshipping-opportunity-monitor')({
  server:{
    handlers:{
      POST:async({request})=>{
        const authorization=request.headers.get('authorization')??'';
        const supplied=authorization.startsWith('Bearer ')?authorization.slice(7):'';
        if(!(await isValidRuntimeWorkerToken('dropshipping_monitor',supplied))){
          return json({error:'Unauthorized'},401);
        }
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
