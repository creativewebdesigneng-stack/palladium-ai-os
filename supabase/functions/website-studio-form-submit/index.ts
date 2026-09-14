import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const hex=async(value:string)=>{
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
};
const text=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const length=Number(req.headers.get("content-length")||"0");
  if(length>65536)return json({error:"payload_too_large"},413);
  try{
    const body=await req.json();
    const projectId=text(body?.projectId,36);
    const formKey=text(body?.formKey,120);
    const token=text(body?.token,256);
    const sourceUrl=text(body?.sourceUrl,2048);
    const honeypot=text(body?.website,200);
    const payload=body?.payload&&typeof body.payload==="object"&&!Array.isArray(body.payload)?body.payload:null;
    if(!projectId||!formKey||!token||!payload)return json({error:"invalid_submission"},400);
    if(honeypot)return json({ok:true});
    if(new TextEncoder().encode(JSON.stringify(payload)).byteLength>32768)return json({error:"payload_too_large"},413);

    const url=Deno.env.get("SUPABASE_URL")||"";
    const secret=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!url||!secret)return json({error:"runtime_not_configured"},503);
    const supabase=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const suppliedHash=await hex(token);
    const {data:project,error:projectError}=await supabase.from("website_studio_projects")
      .select("id,status,form_submit_token_hash,app_config").eq("id",projectId).maybeSingle();
    if(projectError||!project)return json({error:"project_not_found"},404);
    if(project.status!=="published")return json({error:"project_not_published"},409);
    if(!project.form_submit_token_hash||project.form_submit_token_hash!==suppliedHash)return json({error:"invalid_token"},403);
    const forms=Array.isArray(project.app_config?.forms)?project.app_config.forms:[];
    const configured=forms.some((form:Record<string,unknown>)=>String(form?.name||"").trim().toLowerCase()===formKey.toLowerCase());
    if(!configured)return json({error:"form_not_configured"},400);
    const {error:insertError}=await supabase.from("website_studio_form_submissions").insert({
      project_id:projectId,form_key:formKey,payload,source_url:sourceUrl||null,
      user_agent:text(req.headers.get("user-agent"),512)||null,submit_token_hash:suppliedHash,status:"new",
    });
    if(insertError)return json({error:"submission_failed"},500);
    return json({ok:true},201);
  }catch{return json({error:"invalid_request"},400);}
});
