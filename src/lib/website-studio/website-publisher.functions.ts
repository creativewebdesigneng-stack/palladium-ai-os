import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assessWebsiteQuality } from '@/lib/website-studio/website-quality';
import { assessPublishReadiness } from '@/lib/website-studio/website-publish';
import { buildWebsiteProjectManifest } from '@/lib/website-studio/website-project';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb={from:(table:string)=>any};

const targetSchema=z.enum(['preview','production']);
const deploySchema=z.object({projectId:z.string().uuid(),target:targetSchema});

function publisherConfig(){
  const token=process.env['WEBSITE_STUDIO_VERCEL_TOKEN']?.trim()||'';
  const teamId=process.env['WEBSITE_STUDIO_VERCEL_TEAM_ID']?.trim()||'';
  return {configured:Boolean(token&&teamId),token,teamId};
}

function hasBackendDependencies(appConfig:unknown):boolean{
  if(!appConfig||typeof appConfig!=='object')return false;
  const config=appConfig as Record<string,any>;
  return Boolean(
    (Array.isArray(config['forms'])&&config['forms'].length)||
    (Array.isArray(config['collections'])&&config['collections'].length)||
    config['auth']?.enabled
  );
}

async function createVercelDeployment(args:{
  token:string;teamId:string;name:string;files:Array<{file:string;data:string}>;target:'preview'|'production';
}){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30_000);
  try{
    const body:Record<string,unknown>={
      name:args.name,
      files:args.files,
      meta:{source:'blackstar-website-studio'},
    };
    if(args.target==='production')body['target']='production';

    const response=await fetch(`https://api.vercel.com/v13/deployments?teamId=${encodeURIComponent(args.teamId)}`,{
      method:'POST',
      headers:{
        Authorization:`Bearer ${args.token}`,
        'Content-Type':'application/json',
      },
      body:JSON.stringify(body),
      signal:controller.signal,
    });

    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      const message=typeof payload?.error?.message==='string'?payload.error.message:`Vercel deployment failed with HTTP ${response.status}.`;
      throw new Error(message);
    }

    const id=typeof payload?.id==='string'?payload.id:'';
    const url=typeof payload?.url==='string'?payload.url:'';
    if(!id||!url)throw new Error('Vercel returned an incomplete deployment response.');
    return {id,url:url.startsWith('http')?url:`https://${url}`,readyState:typeof payload?.readyState==='string'?payload.readyState:null};
  }finally{
    clearTimeout(timeout);
  }
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

    const {data:assets,error:assetError}=await sb.from('website_studio_assets').select('id,storage_path').eq('project_id',data.projectId);
    if(assetError)throw new Error(assetError.message);
    const privateAssetCount=(assets??[]).filter((asset:any)=>Boolean(asset.storage_path)).length;
    if(privateAssetCount>0){
      throw new Error(`This project has ${privateAssetCount} private uploaded asset${privateAssetCount===1?'':'s'}. Public asset promotion is not connected yet, so publishing is blocked to avoid broken expiring URLs.`);
    }

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
      html:project.html||'',
      css:project.css||'',
      javascript:project.javascript||'',
      pages:Array.isArray(project.pages)?project.pages:[],
      designTokens:project.design_tokens||{},
      brief:project.brief||{},
      appConfig:project.app_config||{},
    });

    try{
      const deployment=await createVercelDeployment({
        token,
        teamId,
        name:project.slug,
        files:manifest.files.map((file)=>({file:file.path,data:file.content})),
        target:data.target,
      });

      const update=data.target==='production'?{
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
      const {error:updateError}=await sb.from('website_studio_projects').update(update).eq('id',data.projectId);
      if(updateError)throw new Error(updateError.message);

      await writeAudit({
        userId:context.userId,
        action:'website_studio.publish',
        targetType:'website_studio_project',
        targetId:data.projectId,
        status:'success',
        metadata:{provider:'vercel',target:data.target,deployment_id:deployment.id,ready_state:deployment.readyState},
      });

      return {provider:'vercel',target:data.target,url:deployment.url,deploymentId:deployment.id,readyState:deployment.readyState};
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
