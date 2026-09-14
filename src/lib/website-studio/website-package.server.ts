import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import { buildWebsiteProjectManifest } from '@/lib/website-studio/website-project';
import { buildDeploymentAssetManifest, deploymentAssetPath, rewriteWebsiteAssetReferences } from '@/lib/website-studio/website-assets';

export type WebsitePackageFile={file:string;data:string;encoding:'utf-8'|'base64'};

const FORM_ENDPOINT='https://piwhiuangitqvwvwwcga.supabase.co/functions/v1/website-studio-form-submit';

function formRuntime(projectId:string,token:string,forms:unknown[]):string{
  const names=(Array.isArray(forms)?forms:[]).map((f:any)=>String(f?.name||'').trim()).filter(Boolean);
  if(names.length===0)return '';
  return `\n;(()=>{const endpoint=${JSON.stringify(FORM_ENDPOINT)},projectId=${JSON.stringify(projectId)},token=${JSON.stringify(token)},names=${JSON.stringify(names)};document.addEventListener('submit',async(e)=>{const form=e.target;if(!(form instanceof HTMLFormElement))return;const key=(form.dataset.blackstarForm||form.getAttribute('name')||'').trim();if(!names.includes(key))return;e.preventDefault();const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;try{const data=Object.fromEntries(new FormData(form).entries());const website=String(data.website||'');delete data.website;const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,formKey:key,token,payload:data,sourceUrl:location.href,website})});if(!response.ok)throw new Error('submission_failed');form.reset();form.dispatchEvent(new CustomEvent('blackstar:form-success',{bubbles:true,detail:{formKey:key}}));}catch{form.dispatchEvent(new CustomEvent('blackstar:form-error',{bubbles:true,detail:{formKey:key}}));}finally{if(button)button.disabled=false;}},true);})();\n`;
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
  if(configuredForms.length>0){
    formToken=randomBytes(32).toString('base64url');
    const formSubmitTokenHash=createHash('sha256').update(formToken).digest('hex');
    const {error:tokenError}=await sb.from('website_studio_projects').update({form_submit_token_hash:formSubmitTokenHash,updated_at:new Date().toISOString()}).eq('id',project.id);
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
