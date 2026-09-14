import {createHash} from 'node:crypto';

export type FormDeploymentTokenTarget=`vercel:${'preview'|'production'}`|`github:${string}`;

type RpcSb={
  rpc:(name:string,args:Record<string,unknown>)=>Promise<{error:{message:string}|null}>;
};

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

export function vercelFormTokenTarget(target:'preview'|'production'):FormDeploymentTokenTarget{
  return `vercel:${target}`;
}

export function githubFormTokenTarget(repository:string,branch:string,rootPath:string):FormDeploymentTokenTarget{
  const digest=createHash('sha256')
    .update(`${repository.trim().toLowerCase()}\n${branch.trim()}\n${rootPath.trim()}`)
    .digest('hex');
  return `github:${digest}`;
}

export function stagedWebsiteStudioFormDeploymentTokenRef(
  value:unknown,
  target:FormDeploymentTokenTarget,
):string|null{
  const tokens=asRecord(value);
  const slot=asRecord(tokens[target]);
  const pendingRef=slot['pending_ref'];
  const pendingHash=slot['pending_hash'];
  return typeof pendingRef==='string'
    &&pendingRef.length>0
    &&typeof pendingHash==='string'
    &&/^[0-9a-f]{64}$/.test(pendingHash)
    ?pendingRef
    :null;
}

export function hasStagedWebsiteStudioFormDeploymentToken(
  value:unknown,
  target:FormDeploymentTokenTarget,
  stagingRef:string,
):boolean{
  return stagedWebsiteStudioFormDeploymentTokenRef(value,target)===stagingRef;
}

export async function stageWebsiteStudioFormDeploymentToken(
  sb:RpcSb,
  args:{projectId:string;target:FormDeploymentTokenTarget;tokenHash:string|null;stagingRef:string},
):Promise<void>{
  if(!args.tokenHash)return;
  const {error}=await sb.rpc('website_studio_stage_form_deployment_token',{
    p_project_id:args.projectId,
    p_target:args.target,
    p_token_hash:args.tokenHash,
    p_staging_ref:args.stagingRef,
  });
  if(error)throw new Error(`Could not stage the public form token: ${error.message}`);
}

export async function promoteWebsiteStudioFormDeploymentToken(
  sb:RpcSb,
  args:{projectId:string;target:FormDeploymentTokenTarget;stagingRef:string;activeRef:string},
):Promise<void>{
  const {error}=await sb.rpc('website_studio_promote_form_deployment_token',{
    p_project_id:args.projectId,
    p_target:args.target,
    p_staging_ref:args.stagingRef,
    p_active_ref:args.activeRef,
  });
  if(error)throw new Error(`Could not activate the public form token: ${error.message}`);
}
