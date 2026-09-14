import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assessWebsiteQuality } from '@/lib/website-studio/website-quality';
import { assessPublishReadiness } from '@/lib/website-studio/website-publish';
import { buildWebsiteProjectManifest } from '@/lib/website-studio/website-project';
import { writeAudit } from '@/lib/platform/audit.server';
import { Buffer } from 'node:buffer';
import { buildDeploymentAssetManifest, deploymentAssetPath, rewriteWebsiteAssetReferences } from '@/lib/website-studio/website-assets';

type Sb={from:(table:string)=>any;storage:{from:(bucket:string)=>{download:(path:string)=>Promise<{data:Blob|null;error:{message:string}|null}>}}};
type PublishTarget='preview'|'production';
type DeploymentState={id:string;url:string;readyState:string|null};

const targetSchema=z.enum(['preview','production']);
const deploySchema=z.object({projectId:z.string().uuid(),target:targetSchema});
const domainNameSchema=z.string().trim().toLowerCase().min(3).max(253).refine((value)=>{
  if(value.includes('/')||value.includes(':')||value.includes(' '))return false;
  try{return new URL('https://'+value).hostname===value}catch{return false}
},{message:'Enter a hostname such as example.com or www.example.com.'});
const domainSchema=z.object({projectId:z.string().uuid(),domain:domainNameSchema});
const verifyDomainSchema=z.object({projectId:z.string().uuid()});

function publisherConfig(){
  const token=process.env['WEBSITE_STUDIO_VERCEL_TOKEN']?.trim()||'';
  const teamId=process.env['WEBSITE_STUDIO_VERCEL_TEAM_ID']?.trim()||'';
  return {configured:Boolean(token&&teamId),token,teamId};
}

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'?value as Record<string,unknown>:{};
}

function hasBackendDependencies(appConfig:unknown):boolean{
  const config=asRecord(appConfig);
  const auth=asRecord(config['auth']);
  return Boolean(
    (Array.isArray(config['forms'])&&config['forms'].length)||
    (Array.isArray(config['collections'])&&config['collections'].length)||
    auth['enabled']
  );
}

async function vercelFetchJson(url:string,token:string,init?:RequestInit):Promise<{ok:boolean;status:number;payload:Record<string,unknown>}>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15_000);
  try{
    const response=await fetch(url,{
      ...init,
      headers:{
        Authorization:`Bearer ${token}`,
        'Content-Type':'application/json',
        ...(init?.headers||{}),
      },
      signal:controller.signal,
    });
    const payload=asRecord(await response.json().catch(()=>({})));
    return {ok:response.ok,status:response.status,payload};
  }finally{
    clearTimeout(timeout);
  }
}

function deploymentFromPayload(payload:Record<string,unknown>):DeploymentState{
  const id=typeof payload['id']==='string'?payload['id']:'';
  const rawUrl=typeof payload['url']==='string'?payload['url']:'';
  if(!id||!rawUrl)throw new Error('Vercel returned an incomplete deployment response.');
  return {
    id,
    url:rawUrl.startsWith('http')?rawUrl:`https://${rawUrl}`,
    readyState:typeof payload['readyState']==='string'?payload['readyState']:typeof payload['state']==='string'?payload['state']:null,
  };
}

function vercelError(payload:Record<string,unknown>,status:number):Error{
  const error=asRecord(payload['error']);
  const message=typeof error['message']==='string'?error['message']:`Vercel request failed with HTTP ${status}.`;
  return new Error(message);
}

async function createVercelDeployment(args:{
  token:string;teamId:string;name:string;files:Array<{file:string;data:string;encoding?:'utf-8'|'base64'}>;target:PublishTarget;
}):Promise<DeploymentState>{
  const body:Record<string,unknown>={
    name:args.name,
    files:args.files,
    meta:{source:'blackstar-website-studio'},
  };
  if(args.target==='production')body['target']='production';

  const result=await vercelFetchJson(
    `https://api.vercel.com/v13/deployments?teamId=${encodeURIComponent(args.teamId)}`,
    args.token,
    {method:'POST',body:JSON.stringify(body)},
  );
  if(!result.ok)throw vercelError(result.payload,result.status);
  return deploymentFromPayload(result.payload);
}

async function getVercelDeployment(token:string,teamId:string,id:string):Promise<DeploymentState>{
  const result=await vercelFetchJson(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}?teamId=${encodeURIComponent(teamId)}`,
    token,
  );
  if(!result.ok)throw vercelError(result.payload,result.status);
  return deploymentFromPayload(result.payload);
}

function terminalFailure(state:string|null):boolean{
  return state==='ERROR'||state==='CANCELED';
}

async function waitForVercelReady(token:string,teamId:string,deployment:DeploymentState):Promise<{deployment:DeploymentState;verified:boolean}>{
  let current=deployment;
  for(let attempt=0;attempt<10;attempt+=1){
    if(current.readyState==='READY')return {deployment:current,verified:true};
    if(terminalFailure(current.readyState))throw new Error(`Vercel deployment ended in state ${current.readyState}.`);
    if(attempt<9)await new Promise((resolve)=>setTimeout(resolve,1500));
    current=await getVercelDeployment(token,teamId,deployment.id);
  }
  return {deployment:current,verified:false};
}

async function markDeploymentReady(sb:Sb,projectId:string,target:PublishTarget,deployment:DeploymentState){
  const update=target==='production'?{
    production_url:deployment.url,
    deployment_provider:'vercel',
    deployment_id:deployment.id,
    status:'published',
    updated_at:new Date().toISOString(),
  }:{
    preview_url:deployment.url,
    deployment_provider:'vercel',
    deployment_id:deployment.id,
    status:'ready',
    updated_at:new Date().toISOString(),
  };
  const {error}=await sb.from('website_studio_projects').update(update).eq('id',projectId);
  if(error)throw new Error(error.message);
}

export const getWebsiteStudioPublisherStatus=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async()=>{
    const {configured,teamId}=publisherConfig();
    return {configured,provider:'vercel',teamConfigured:Boolean(teamId)};
  });

export const publishWebsiteStudioProject=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>deploySchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {configured,token,teamId}=publisherConfig();
    if(!configured)throw new Error('Website Studio Vercel publishing is not configured on this deployment.');

    const {data:project,error:projectError}=await sb.from('website_studio_projects').select('*').eq('id',data.projectId).maybeSingle();
    if(projectError)throw new Error(projectError.message);
    if(!project)throw new Error('Website Studio project not found.');

    const {data:assets,error:assetError}=await sb.from('website_studio_assets').select('id,name,source_url,storage_path').eq('project_id',data.projectId);
    if(assetError)throw new Error(assetError.message);
    const deploymentAssets=Array.isArray(assets)?assets:[];

    const quality=assessWebsiteQuality(project.html||'',project.css||'');
    const readiness=assessPublishReadiness({
      name:project.name||'',
      slug:project.slug||'',
      html:project.html||'',
      css:project.css||'',
      pages:Array.isArray(project.pages)?project.pages:[],
      qualityScore:quality.score,
      appConfig:project.app_config||{},
      saved:true,
    });
    if(!readiness.ready){
      const failures=readiness.checks.filter((check)=>!check.ok).map((check)=>check.detail).join(' ');
      throw new Error(`Website publish preflight failed. ${failures}`);
    }
    if(hasBackendDependencies(project.app_config)){
      throw new Error('This project defines forms, data collections or authentication that are not provisioned yet.');
    }

    const manifest=buildWebsiteProjectManifest({
      name:project.name,
      slug:project.slug,
      framework:project.framework||'html',
      html:rewriteWebsiteAssetReferences(project.html||'',deploymentAssets),
      css:rewriteWebsiteAssetReferences(project.css||'',deploymentAssets),
      javascript:rewriteWebsiteAssetReferences(project.javascript||'',deploymentAssets),
      pages:Array.isArray(project.pages)?project.pages:[],
      designTokens:project.design_tokens||{},
      brief:project.brief||{},
      appConfig:project.app_config||{},
    });

    const deployFiles:Array<{file:string;data:string;encoding?:'utf-8'|'base64'}>=manifest.files.map((file)=>({file:file.path,data:file.content,encoding:'utf-8'}));
    deployFiles.push({
      file:'site/assets.json',
      data:JSON.stringify(buildDeploymentAssetManifest(deploymentAssets),null,2),
      encoding:'utf-8',
    });

    let totalPrivateBytes=0;
    for(const asset of deploymentAssets){
      if(!asset.storage_path)continue;
      const {data:blob,error:downloadError}=await sb.storage.from('website-studio-assets').download(asset.storage_path);
      if(downloadError)throw new Error(`Could not read private asset "${asset.name}": ${downloadError.message}`);
      if(!blob)throw new Error(`Could not read private asset "${asset.name}".`);
      if(blob.size>26_214_400)throw new Error(`Asset "${asset.name}" exceeds the 25 MB Website Studio publishing limit.`);
      totalPrivateBytes+=blob.size;
      if(totalPrivateBytes>52_428_800)throw new Error('Private uploaded assets exceed the 50 MB per-deployment publishing limit.');
      const buffer=Buffer.from(await blob.arrayBuffer());
      deployFiles.push({
        file:deploymentAssetPath(asset),
        data:buffer.toString('base64'),
        encoding:'base64',
      });
    }

    try{
      const created=await createVercelDeployment({
        token,
        teamId,
        name:project.slug,
        files:deployFiles,
        target:data.target,
      });

      const {error:idError}=await sb.from('website_studio_projects').update({
        deployment_provider:'vercel',
        deployment_id:created.id,
        updated_at:new Date().toISOString(),
      }).eq('id',data.projectId);
      if(idError)throw new Error(idError.message);

      const verified=await waitForVercelReady(token,teamId,created);
      if(verified.verified)await markDeploymentReady(sb,data.projectId,data.target,verified.deployment);

      await writeAudit({
        userId:context.userId,
        action:'website_studio.publish',
        targetType:'website_studio_project',
        targetId:data.projectId,
        status:'success',
        metadata:{provider:'vercel',target:data.target,deployment_id:created.id,ready_state:verified.deployment.readyState,verified_ready:verified.verified,promoted_private_assets:deploymentAssets.filter((asset:any)=>Boolean(asset.storage_path)).length},
      });

      return {
        provider:'vercel',
        target:data.target,
        url:verified.deployment.url,
        deploymentId:created.id,
        readyState:verified.deployment.readyState,
        verified:verified.verified,
      };
    }catch(error){
      await writeAudit({
        userId:context.userId,
        action:'website_studio.publish',
        targetType:'website_studio_project',
        targetId:data.projectId,
        status:'failed',
        metadata:{provider:'vercel',target:data.target,error:error instanceof Error?error.message.slice(0,300):'unknown'},
      });
      throw new Error(error instanceof Error?error.message:'Website publishing failed.');
    }
  });

export const verifyWebsiteStudioDeployment=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>deploySchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {configured,token,teamId}=publisherConfig();
    if(!configured)throw new Error('Website Studio Vercel publishing is not configured on this deployment.');

    const {data:project,error}=await sb.from('website_studio_projects').select('id,deployment_provider,deployment_id').eq('id',data.projectId).maybeSingle();
    if(error)throw new Error(error.message);
    if(!project?.deployment_id||project.deployment_provider!=='vercel')throw new Error('No Vercel deployment is recorded for this project.');

    const deployment=await getVercelDeployment(token,teamId,project.deployment_id);
    if(terminalFailure(deployment.readyState))throw new Error(`Vercel deployment ended in state ${deployment.readyState}.`);
    const verified=deployment.readyState==='READY';
    if(verified)await markDeploymentReady(sb,data.projectId,data.target,deployment);

    return {provider:'vercel',target:data.target,url:deployment.url,deploymentId:deployment.id,readyState:deployment.readyState,verified};
  });


function domainStateFromPayload(domain:string,payload:Record<string,unknown>){
  const verification=Array.isArray(payload['verification'])?payload['verification']:[];
  return {
    domain,
    verified:payload['verified']===true,
    verification,
    lastCheckedAt:new Date().toISOString(),
  };
}

export const addWebsiteStudioDomain=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>domainSchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {configured,token,teamId}=publisherConfig();
    if(!configured)throw new Error('Website Studio Vercel publishing is not configured on this deployment.');

    const {data:project,error}=await sb.from('website_studio_projects')
      .select('id,slug,deployment_provider,deployment_id')
      .eq('id',data.projectId)
      .maybeSingle();
    if(error)throw new Error(error.message);
    if(!project)throw new Error('Website Studio project not found.');
    if(project.deployment_provider!=='vercel'||!project.deployment_id){
      throw new Error('Create a Website Studio Vercel deployment before adding a custom domain.');
    }

    const result=await vercelFetchJson(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(project.slug)}/domains?teamId=${encodeURIComponent(teamId)}`,
      token,
      {method:'POST',body:JSON.stringify({name:data.domain})},
    );
    if(!result.ok)throw vercelError(result.payload,result.status);

    const domainState=domainStateFromPayload(data.domain,result.payload);
    const {error:updateError}=await sb.from('website_studio_projects')
      .update({domain_config:domainState,updated_at:new Date().toISOString()})
      .eq('id',data.projectId);
    if(updateError)throw new Error(updateError.message);

    await writeAudit({
      userId:context.userId,
      action:'website_studio.domain.add',
      targetType:'website_studio_project',
      targetId:data.projectId,
      status:'success',
      metadata:{provider:'vercel',domain:data.domain,verified:domainState.verified},
    });

    return domainState;
  });

export const verifyWebsiteStudioDomain=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>verifyDomainSchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {configured,token,teamId}=publisherConfig();
    if(!configured)throw new Error('Website Studio Vercel publishing is not configured on this deployment.');

    const {data:project,error}=await sb.from('website_studio_projects')
      .select('id,slug,deployment_provider,deployment_id,domain_config')
      .eq('id',data.projectId)
      .maybeSingle();
    if(error)throw new Error(error.message);
    if(!project)throw new Error('Website Studio project not found.');
    if(project.deployment_provider!=='vercel'||!project.deployment_id){
      throw new Error('Create a Website Studio Vercel deployment before verifying a domain.');
    }

    const config=asRecord(project.domain_config);
    const domain=domainNameSchema.parse(config['domain']);
    const result=await vercelFetchJson(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(project.slug)}/domains/${encodeURIComponent(domain)}/verify?teamId=${encodeURIComponent(teamId)}`,
      token,
      {method:'POST',body:JSON.stringify({})},
    );
    if(!result.ok)throw vercelError(result.payload,result.status);

    const domainState=domainStateFromPayload(domain,result.payload);
    const {error:updateError}=await sb.from('website_studio_projects')
      .update({domain_config:domainState,updated_at:new Date().toISOString()})
      .eq('id',data.projectId);
    if(updateError)throw new Error(updateError.message);

    await writeAudit({
      userId:context.userId,
      action:'website_studio.domain.verify',
      targetType:'website_studio_project',
      targetId:data.projectId,
      status:'success',
      metadata:{provider:'vercel',domain,verified:domainState.verified},
    });

    return domainState;
  });
