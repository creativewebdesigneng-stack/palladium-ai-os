import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
type Sb={from:(t:string)=>any};
const schema=z.object({id:z.string().uuid().optional(),name:z.string().trim().min(1).max(120),metric:z.enum(["portfolio_value","cash_reserve","monthly_expense","monthly_revenue"]),operator:z.enum(["above","below"]),threshold:z.coerce.number().min(0).max(1e15),enabled:z.boolean().default(true)});
export const listFinanceAlerts=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{const sb=context.supabase as unknown as Sb;const {data,error}=await sb.from("finance_alerts").select("*").order("created_at",{ascending:false});if(error)throw new Error(error.message);return data??[];});
export const saveFinanceAlert=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>schema.parse(v)).handler(async({data,context})=>{const sb=context.supabase as unknown as Sb;const row={name:data.name,metric:data.metric,operator:data.operator,threshold:data.threshold,enabled:data.enabled,updated_at:new Date().toISOString()};if(data.id){const {data:out,error}=await sb.from("finance_alerts").update(row).eq("id",data.id).select().single();if(error)throw new Error(error.message);return out;}const {data:out,error}=await sb.from("finance_alerts").insert({...row,user_id:context.userId}).select().single();if(error)throw new Error(error.message);return out;});
export const deleteFinanceAlert=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({data,context})=>{const sb=context.supabase as unknown as Sb;const {error}=await sb.from("finance_alerts").delete().eq("id",data.id);if(error)throw new Error(error.message);return{ok:true};});

export const evaluateFinanceAlerts=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const sb=context.supabase as unknown as Sb;
 const [{data:alerts,error:aErr},{data:holdings,error:hErr},{data:tx,error:tErr}]=await Promise.all([
  sb.from("finance_alerts").select("*").eq("enabled",true),
  sb.from("finance_holdings").select("manual_value"),
  sb.from("finance_transactions").select("direction,amount,occurred_on,status").gte("occurred_on",new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10))
 ]);
 if(aErr)throw new Error(aErr.message); if(hErr)throw new Error(hErr.message); if(tErr)throw new Error(tErr.message);
 const settled=(tx??[]).filter((x:any)=>x.status==="settled");
 const values:Record<string,number>={
  portfolio_value:(holdings??[]).reduce((s:number,x:any)=>s+Number(x.manual_value??0),0),
  monthly_revenue:settled.filter((x:any)=>x.direction==="income").reduce((s:number,x:any)=>s+Number(x.amount??0),0),
  monthly_expense:settled.filter((x:any)=>x.direction==="expense").reduce((s:number,x:any)=>s+Number(x.amount??0),0),
  cash_reserve:0,
 };
 const results=[];
 for(const alert of alerts??[]){
  if(alert.metric==="cash_reserve"){results.push({id:alert.id,name:alert.name,status:"unavailable",reason:"No verified cash-account source is connected."});continue;}
  const value=values[alert.metric]??0,threshold=Number(alert.threshold),triggered=alert.operator==="above"?value>threshold:value<threshold;
  let notified=false;
  if(triggered){
   const cooldown=!alert.last_triggered_at||Date.now()-new Date(alert.last_triggered_at).getTime()>86400000;
   if(cooldown){
    const {notifyWithOutcome}=await import("@/lib/notifications/notify.server");
    const outcome=await notifyWithOutcome({userId:context.userId,type:"finance.threshold_triggered",title:`Finance alert: ${alert.name}`,body:`${alert.metric.replace(/_/g," ")} is £${value.toLocaleString()} (${alert.operator} £${threshold.toLocaleString()}).`,link:"/finance",metadata:{finance_alert_id:alert.id,metric:alert.metric,value,threshold}});
    if(outcome!=="failed"){await sb.from("finance_alerts").update({last_triggered_at:new Date().toISOString()}).eq("id",alert.id);notified=outcome==="emitted";}
   }
  }
  results.push({id:alert.id,name:alert.name,status:triggered?"triggered":"clear",value,threshold,notified});
 }
 return{evaluated_at:new Date().toISOString(),results};
});
