import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_REQUEST_BYTES=65_536;
const MAX_PAYLOAD_BYTES=32_768;
const MAX_FIELDS=64;
const MAX_FIELD_NAME_LENGTH=128;
const MAX_TEXT_VALUE_LENGTH=4_000;
const MAX_ARRAY_VALUES=32;
const MAX_SOURCE_URL_LENGTH=2_048;

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
const asRecord=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};

function safeEqualHex(left:string,right:string):boolean{
  if(left.length!==right.length)return false;
  let difference=0;
  for(let index=0;index<left.length;index+=1){
    difference|=left.charCodeAt(index)^right.charCodeAt(index);
  }
  return difference===0;
}

function fieldName(value:unknown):string{
  if(typeof value==="string")return value.trim().slice(0,MAX_FIELD_NAME_LENGTH);
  const record=asRecord(value);
  const candidate=record["name"]??record["key"]??record["id"];
  return typeof candidate==="string"?candidate.trim().slice(0,MAX_FIELD_NAME_LENGTH):"";
}

function configuredFieldNames(form:Record<string,unknown>):Set<string>|null{
  const raw=form["fields"];
  if(Array.isArray(raw)){
    const names=raw.map(fieldName).filter(Boolean).slice(0,MAX_FIELDS);
    return names.length?new Set(names):null;
  }
  if(raw&&typeof raw==="object"){
    const names=Object.keys(raw as Record<string,unknown>).map(name=>name.trim().slice(0,MAX_FIELD_NAME_LENGTH)).filter(Boolean).slice(0,MAX_FIELDS);
    return names.length?new Set(names):null;
  }
  return null;
}

function requiredFieldNames(form:Record<string,unknown>):Set<string>{
  const raw=form["fields"];
  if(!Array.isArray(raw))return new Set();
  const required=raw
    .filter((field)=>asRecord(field)["required"]===true)
    .map(fieldName)
    .filter(Boolean)
    .slice(0,MAX_FIELDS);
  return new Set(required);
}

function normalizeValue(value:unknown):string|number|boolean|null|Array<string|number|boolean|null>|undefined{
  if(value===null||typeof value==="number"||typeof value==="boolean")return value;
  if(typeof value==="string")return value.length<=MAX_TEXT_VALUE_LENGTH?value:undefined;
  if(Array.isArray(value)){
    if(value.length>MAX_ARRAY_VALUES)return undefined;
    const normalized:Array<string|number|boolean|null>=[];
    for(const item of value){
      if(item===null||typeof item==="number"||typeof item==="boolean")normalized.push(item);
      else if(typeof item==="string"&&item.length<=MAX_TEXT_VALUE_LENGTH)normalized.push(item);
      else return undefined;
    }
    return normalized;
  }
  return undefined;
}

function normalizePayload(value:unknown,allowed:Set<string>|null):Record<string,unknown>|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const entries=Object.entries(value as Record<string,unknown>);
  if(entries.length>MAX_FIELDS)return null;
  const payload:Record<string,unknown>={};
  for(const [rawKey,rawValue] of entries){
    const key=rawKey.trim();
    if(!key||key.length>MAX_FIELD_NAME_LENGTH)return null;
    if(key==="website"||key==="honeypot")continue;
    if(allowed&&!allowed.has(key))return null;
    const normalized=normalizeValue(rawValue);
    if(normalized===undefined)return null;
    payload[key]=normalized;
  }
  const bytes=new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  return bytes<=MAX_PAYLOAD_BYTES?payload:null;
}

function hasRequiredValue(value:unknown):boolean{
  if(value===null||value===undefined)return false;
  if(typeof value==="string")return value.trim().length>0;
  if(Array.isArray(value))return value.some(hasRequiredValue);
  return true;
}

function validSourceUrl(value:string):string{
  if(!value)return "";
  try{
    const parsed=new URL(value);
    return parsed.protocol==="https:"||parsed.protocol==="http:"?value:"";
  }catch{return "";}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);

  const length=Number(req.headers.get("content-length")||"0");
  if(Number.isFinite(length)&&length>MAX_REQUEST_BYTES)return json({error:"payload_too_large"},413);

  try{
    const body=await req.json();
    const projectId=text(body?.projectId,36);
    const formKey=text(body?.formKey,120);
    const token=text(body?.token,256);
    const rawSourceUrl=text(body?.sourceUrl,MAX_SOURCE_URL_LENGTH);
    const sourceUrl=validSourceUrl(rawSourceUrl);
    const honeypot=text(body?.honeypot,200)||text(body?.website,200);

    if(!projectId||!formKey||!token||!body?.payload||typeof body.payload!=="object"||Array.isArray(body.payload)){
      return json({error:"invalid_submission"},400);
    }
    if(rawSourceUrl&&!sourceUrl)return json({error:"invalid_source_url"},400);
    if(honeypot)return json({ok:true});

    const url=Deno.env.get("SUPABASE_URL")||"";
    const secret=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!url||!secret)return json({error:"runtime_not_configured"},503);

    const supabase=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const suppliedHash=await hex(token);
    const {data:project,error:projectError}=await supabase.from("website_studio_projects")
      .select("id,status,form_submit_token_hash,app_config")
      .eq("id",projectId)
      .maybeSingle();

    if(projectError||!project)return json({error:"project_not_found"},404);
    if(project.status!=="published")return json({error:"project_not_published"},409);
    if(!project.form_submit_token_hash||!safeEqualHex(String(project.form_submit_token_hash),suppliedHash)){
      return json({error:"invalid_token"},403);
    }

    const forms=Array.isArray(project.app_config?.forms)?project.app_config.forms:[];
    const configuredForm=forms
      .map(asRecord)
      .find((form)=>String(form["name"]||"").trim().toLowerCase()===formKey.toLowerCase());
    if(!configuredForm)return json({error:"form_not_configured"},400);

    const allowedFields=configuredFieldNames(configuredForm);
    const payload=normalizePayload(body.payload,allowedFields);
    if(!payload)return json({error:"invalid_payload"},400);

    const requiredFields=requiredFieldNames(configuredForm);
    for(const required of requiredFields){
      if(!hasRequiredValue(payload[required]))return json({error:"required_field_missing",field:required},400);
    }

    const {error:insertError}=await supabase.from("website_studio_form_submissions").insert({
      project_id:projectId,
      form_key:formKey,
      payload,
      source_url:sourceUrl||null,
      user_agent:text(req.headers.get("user-agent"),512)||null,
      submit_token_hash:suppliedHash,
      status:"new",
    });
    if(insertError)return json({error:"submission_failed"},500);
    return json({ok:true},201);
  }catch{
    return json({error:"invalid_request"},400);
  }
});
