import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import { buildWebsiteProjectManifest } from '@/lib/website-studio/website-project';
import { buildDeploymentAssetManifest, deploymentAssetPath, rewriteWebsiteAssetReferences } from '@/lib/website-studio/website-assets';

export type WebsitePackageFile={file:string;data:string;encoding:'utf-8'|'base64'};

type RuntimeForm={name:string;fields:string[]};

const FORM_ENDPOINT='https://piwhiuangitqvwvwwcga.supabase.co/functions/v1/website-studio-form-submit';
const MAX_RUNTIME_FIELDS=64;
const MAX_FIELD_NAME_LENGTH=128;

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

function fieldName(value:unknown):string{
  if(typeof value==='string')return value.trim().slice(0,MAX_FIELD_NAME_LENGTH);
  const field=asRecord(value);
  const candidate=field['name']??field['key']??field['id'];
  return typeof candidate==='string'?candidate.trim().slice(0,MAX_FIELD_NAME_LENGTH):'';
}

function runtimeForms(forms:unknown[]):RuntimeForm[]{
  const seen=new Set<string>();
  const result:RuntimeForm[]=[];
  for(const value of Array.isArray(forms)?forms:[]){
    const form=asRecord(value);
    const name=typeof form['name']==='string'?form['name'].trim().slice(0,120):'';
    const normalized=name.toLowerCase();
    if(!name||seen.has(normalized))continue;
    seen.add(normalized);
    const rawFields=form['fields'];
    let fields:string[]=[];
    if(Array.isArray(rawFields)){
      fields=rawFields.map(fieldName).filter(Boolean).slice(0,MAX_RUNTIME_FIELDS);
    }else if(rawFields&&typeof rawFields==='object'){
      fields=Object.keys(rawFields as Record<string,unknown>)
        .map((field)=>field.trim().slice(0,MAX_FIELD_NAME_LENGTH))
        .filter(Boolean)
        .slice(0,MAX_RUNTIME_FIELDS);
    }
    result.push({name,fields:[...new Set(fields)]});
  }
  return result;
}

function formRuntime(projectId:string,token:string,forms:unknown[]):string{
  const configured=runtimeForms(forms);
  if(configured.length===0)return '';

  return `\n;(()=>{\nconst endpoint=${JSON.stringify(FORM_ENDPOINT)};\nconst projectId=${JSON.stringify(projectId)};\nconst token=${JSON.stringify(token)};\nconst formDefinitions=${JSON.stringify(configured)};\nconst definitions=new Map(formDefinitions.map((form)=>[form.name.toLowerCase(),form]));\nconst statusNode=(form)=>{let node=form.querySelector('[data-blackstar-form-status]');if(node)return node;node=document.createElement('p');node.setAttribute('data-blackstar-form-status','');node.setAttribute('role','status');node.setAttribute('aria-live','polite');form.append(node);return node;};\nconst setState=(form,state,message)=>{form.dataset.blackstarFormState=state;form.setAttribute('aria-busy',state==='submitting'?'true':'false');const node=statusNode(form);node.textContent=message;node.dataset.state=state;};\nconst buttonFor=(form)=>form.querySelector('button[type="submit"],input[type="submit"]');\nconst setSubmitting=(form,submitting)=>{const button=buttonFor(form);if(button instanceof HTMLButtonElement||button instanceof HTMLInputElement)button.disabled=submitting;};\nconst definitionFor=(form)=>{const key=(form.dataset.blackstarForm||form.getAttribute('name')||'').trim();return {key,definition:definitions.get(key.toLowerCase())};};\nconst normalizedValue=(value)=>value instanceof File?value.name:String(value);\nconst buildPayload=(form,definition)=>{const data=new FormData(form);const honeypot=String(data.get('honeypot')??data.get('website')??'').slice(0,200);const allowed=definition.fields.length?new Set(definition.fields):null;const payload={};let fieldCount=0;for(const [key,value] of data.entries()){if(!key||key==='honeypot'||key==='website')continue;if(allowed&&!allowed.has(key))continue;const normalized=normalizedValue(value);if(normalized.length>4000)throw new Error('validation_value_too_long');if(Object.prototype.hasOwnProperty.call(payload,key)){const current=payload[key];payload[key]=Array.isArray(current)?[...current,normalized]:[current,normalized];}else{payload[key]=normalized;fieldCount+=1;if(fieldCount>64)throw new Error('validation_too_many_fields');}}return {payload,honeypot};};\ndocument.addEventListener('invalid',(event)=>{const control=event.target;if(!(control instanceof HTMLElement))return;const form=control.closest('form');if(!(form instanceof HTMLFormElement))return;const {definition}=definitionFor(form);if(!definition&&!form.hasAttribute('data-blackstar-form'))return;setState(form,'validation-error','Please check the highlighted fields and try again.');},true);\ndocument.addEventListener('submit',async(event)=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;const {key,definition}=definitionFor(form);const explicitlyManaged=form.hasAttribute('data-blackstar-form');if(!definition){if(!explicitlyManaged)return;event.preventDefault();setState(form,'runtime-error','This form is not configured for public submission.');form.dispatchEvent(new CustomEvent('blackstar:form-error',{bubbles:true,detail:{formKey:key,reason:'form_not_configured'}}));return;}event.preventDefault();if(!form.checkValidity()){setState(form,'validation-error','Please check the highlighted fields and try again.');form.reportValidity();return;}setSubmitting(form,true);setState(form,'submitting','Submitting…');let controller;let timer;try{const submission=buildPayload(form,definition);controller=new AbortController();timer=setTimeout(()=>controller.abort(),12000);const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,formKey:key,token,payload:submission.payload,sourceUrl:location.href,honeypot:submission.honeypot}),signal:controller.signal});const result=await response.json().catch(()=>({}));if(!response.ok){const validation=response.status===400||response.status===413;if(validation){setState(form,'validation-error','Please check your submission and try again.');form.dispatchEvent(new CustomEvent('blackstar:form-error',{bubbles:true,detail:{formKey:key,reason:result.error||'validation_failed'}}));return;}throw new Error(result.error||'submission_failed');}form.reset();setState(form,'success','Thanks — your submission was received.');form.dispatchEvent(new CustomEvent('blackstar:form-success',{bubbles:true,detail:{formKey:key}}));}catch(error){if(error instanceof Error&&(error.message.startsWith('validation_'))){setState(form,'validation-error','Please check your submission and try again.');form.dispatchEvent(new CustomEvent('blackstar:form-error',{bubbles:true,detail:{formKey:key,reason:error.message}}));}else{setState(form,'runtime-error','We could not submit this form right now. Please try again.');form.dispatchEvent(new CustomEvent('blackstar:form-error',{bubbles:true,detail:{formKey:key,reason:error instanceof Error?error.message:'network_failure'}}));}}finally{if(timer)clearTimeout(timer);setSubmitting(form,false);}},true);\n})();\n`;
}

type PackageSb={
  from:(table:string)=>any;
  storage:{from:(bucket:string)=>{download:(path:string)=>Promise<{data:Blob|null;error:{message:string}|null}>}};
};

export async function buildWebsiteRuntimePackage(sb:PackageSb,project:any):Promise<{files:WebsitePackageFile[];privateAssetCount:number}>{
  const {data:assets,error:assetError}=await sb.from('website_studio_assets')
    .select('id,name,source_url,storage_path')
    .eq('project_id',project.id);
  if(assetError)throw new Error(assetError.message);
  const deploymentAssets=Array.isArray(assets)?assets:[];

  const configuredForms=Array.isArray(project.app_config?.forms)?project.app_config.forms:[];
  let formToken='';
  if(runtimeForms(configuredForms).length>0){
    formToken=randomBytes(32).toString('base64url');
    const formSubmitTokenHash=createHash('sha256').update(formToken).digest('hex');
    const {error:tokenError}=await sb.from('website_studio_projects')
      .update({form_submit_token_hash:formSubmitTokenHash,updated_at:new Date().toISOString()})
      .eq('id',project.id);
    if(tokenError)throw new Error(`Could not provision the public form runtime: ${tokenError.message}`);
  }

  const manifest=buildWebsiteProjectManifest({
    name:project.name,
    slug:project.slug,
    framework:project.framework||'html',
    html:rewriteWebsiteAssetReferences(project.html||'',deploymentAssets),
    css:rewriteWebsiteAssetReferences(project.css||'',deploymentAssets),
    javascript:rewriteWebsiteAssetReferences(project.javascript||'',deploymentAssets)+formRuntime(project.id,formToken,configuredForms),
    pages:Array.isArray(project.pages)?project.pages.map((page:any)=>({
      ...page,
      ...(typeof page?.html==='string'?{html:rewriteWebsiteAssetReferences(page.html,deploymentAssets)}:{}),
    })):[],
    designTokens:project.design_tokens||{},
    brief:project.brief||{},
    appConfig:project.app_config||{},
  });

  const files:WebsitePackageFile[]=manifest.files.map(file=>({file:file.path,data:file.content,encoding:'utf-8'}));
  files.push({
    file:'site/assets.json',
    data:JSON.stringify(buildDeploymentAssetManifest(deploymentAssets),null,2),
    encoding:'utf-8',
  });

  let totalPrivateBytes=0;
  let privateAssetCount=0;
  for(const asset of deploymentAssets){
    if(!asset.storage_path)continue;
    privateAssetCount+=1;
    const {data:blob,error:downloadError}=await sb.storage.from('website-studio-assets').download(asset.storage_path);
    if(downloadError)throw new Error(`Could not read private asset "${asset.name}": ${downloadError.message}`);
    if(!blob)throw new Error(`Could not read private asset "${asset.name}".`);
    if(blob.size>26_214_400)throw new Error(`Asset "${asset.name}" exceeds the 25 MB Website Studio packaging limit.`);
    totalPrivateBytes+=blob.size;
    if(totalPrivateBytes>52_428_800)throw new Error('Private uploaded assets exceed the 50 MB per-package limit.');
    files.push({
      file:deploymentAssetPath(asset),
      data:Buffer.from(await blob.arrayBuffer()).toString('base64'),
      encoding:'base64',
    });
  }

  return {files,privateAssetCount};
}
