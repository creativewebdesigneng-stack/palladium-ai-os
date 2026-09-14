import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { buildWebsiteRuntimePackage } from '@/lib/website-studio/website-package.server';
import {
  githubFormTokenTarget,
  promoteWebsiteStudioFormDeploymentToken,
  stageWebsiteStudioFormDeploymentToken,
} from '@/lib/website-studio/website-form-deployment-tokens.server';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb={
  from:(table:string)=>any;
  rpc:(name:string,args:Record<string,unknown>)=>Promise<{error:{message:string}|null}>;
  storage:{from:(bucket:string)=>{download:(path:string)=>Promise<{data:Blob|null;error:{message:string}|null}>}};
};

const syncSchema=z.object({
  projectId:z.string().uuid(),
  gitConfig:z.object({
    repository:z.string().trim().min(3).max(200),
    branch:z.string().trim().min(1).max(200),
    rootPath:z.string().trim().max(500).default(''),
  }),
});

function githubConfig(){
  const token=process.env['WEBSITE_STUDIO_GITHUB_TOKEN']?.trim()||'';
  const allowedRepositories=new Set(
    (process.env['WEBSITE_STUDIO_GITHUB_ALLOWED_REPOSITORIES']||'')
      .split(',')
      .map(value=>value.trim().toLowerCase())
      .filter(Boolean),
  );
  return {configured:Boolean(token&&allowedRepositories.size),token,allowedRepositories};
}

function assertAllowedRepository(owner:string,repo:string,allowedRepositories:Set<string>){
  const full=`${owner}/${repo}`.toLowerCase();
  if(!allowedRepositories.has(full)){
    throw new Error('This repository is not allowlisted for Website Studio GitHub sync.');
  }
}

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'?value as Record<string,unknown>:{};
}

function parseRepository(value:unknown):{owner:string;repo:string}{
  const raw=String(value||'').trim();
  const match=/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(raw);
  if(!match)throw new Error('Git repository must use owner/repository format.');
  return {owner:match[1]!,repo:match[2]!};
}

function cleanBranch(value:unknown):string{
  const branch=String(value||'main').trim();
  if(!branch||branch.startsWith('/')||branch.endsWith('/')||branch.includes('..')||branch.includes('~')||branch.includes('^')||branch.includes(':')||branch.includes('\\')){
    throw new Error('Git branch name is invalid.');
  }
  return branch;
}

function cleanRootPath(value:unknown):string{
  const root=String(value||'').trim().replace(/^\/+|\/+$/g,'');
  if(!root)return '';
  if(root.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Git root path is invalid.');
  if(root.toLowerCase().startsWith('.github/workflows'))throw new Error('Website Studio will not sync generated projects into .github/workflows.');
  return root;
}

function prefixPath(root:string,path:string):string{
  return root?`${root}/${path}`:path;
}

async function githubJson(token:string,path:string,init?:RequestInit):Promise<Record<string,unknown>>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20_000);
  try{
    const response=await fetch(`https://api.github.com${path}`,{
      ...init,
      headers:{
        Accept:'application/vnd.github+json',
        Authorization:`Bearer ${token}`,
        'X-GitHub-Api-Version':'2026-03-10',
        'Content-Type':'application/json',
        ...(init?.headers||{}),
      },
      signal:controller.signal,
    });
    const payload=asRecord(await response.json().catch(()=>({})));
    if(!response.ok){
      const message=typeof payload['message']==='string'?payload['message']:`GitHub request failed with HTTP ${response.status}.`;
      throw new Error(message);
    }
    return payload;
  }finally{
    clearTimeout(timeout);
  }
}

async function createGithubBlob(token:string,owner:string,repo:string,data:string,encoding:'utf-8'|'base64'){
  const payload=await githubJson(token,`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,{
    method:'POST',
    body:JSON.stringify({content:data,encoding}),
  });
  const sha=typeof payload['sha']==='string'?payload['sha']:'';
  if(!sha)throw new Error('GitHub did not return a blob SHA.');
  return sha;
}

export const getWebsiteStudioGithubStatus=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .handler(async()=>{
    const {configured,allowedRepositories}=githubConfig();
    return {configured,provider:'github',allowedRepositoryCount:allowedRepositories.size};
  });

export const syncWebsiteStudioGithub=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((value:unknown)=>syncSchema.parse(value))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb;
    const {configured,token,allowedRepositories}=githubConfig();
    if(!configured)throw new Error('Website Studio GitHub sync requires a server token and an explicit repository allowlist.');

    const {data:project,error}=await sb.from('website_studio_projects').select('*').eq('id',data.projectId).maybeSingle();
    if(error)throw new Error(error.message);
    if(!project)throw new Error('Website Studio project not found.');

    const git={...asRecord(project.git_config),...data.gitConfig};
    const {owner,repo}=parseRepository(git['repository']);
    assertAllowedRepository(owner,repo,allowedRepositories);
    const repository=`${owner}/${repo}`;
    const branch=cleanBranch(git['branch']);
    const rootPath=cleanRootPath(git['rootPath']);
    const packageResult=await buildWebsiteRuntimePackage(sb,project);
    const formTokenTarget=githubFormTokenTarget(repository,branch,rootPath);

    try{
      const ref=await githubJson(token,`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`);
      const refObject=asRecord(ref['object']);
      const parentSha=typeof refObject['sha']==='string'?refObject['sha']:'';
      if(!parentSha)throw new Error('GitHub branch did not return a commit SHA.');

      const parentCommit=await githubJson(token,`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(parentSha)}`);
      const parentTree=asRecord(parentCommit['tree']);
      const baseTreeSha=typeof parentTree['sha']==='string'?parentTree['sha']:'';
      if(!baseTreeSha)throw new Error('GitHub parent commit did not return a tree SHA.');

      const treeEntries:Array<Record<string,unknown>>=[];
      for(const file of packageResult.files){
        const path=prefixPath(rootPath,file.file);
        if(file.encoding==='utf-8'){
          treeEntries.push({path,mode:'100644',type:'blob',content:file.data});
        }else{
          const sha=await createGithubBlob(token,owner,repo,file.data,'base64');
          treeEntries.push({path,mode:'100644',type:'blob',sha});
        }
      }

      const tree=await githubJson(token,`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,{
        method:'POST',
        body:JSON.stringify({base_tree:baseTreeSha,tree:treeEntries}),
      });
      const treeSha=typeof tree['sha']==='string'?tree['sha']:'';
      if(!treeSha)throw new Error('GitHub did not return a tree SHA.');

      const commit=await githubJson(token,`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,{
        method:'POST',
        body:JSON.stringify({
          message:`Sync ${project.name} from Blackstar Website Studio`,
          tree:treeSha,
          parents:[parentSha],
        }),
      });
      const commitSha=typeof commit['sha']==='string'?commit['sha']:'';
      if(!commitSha)throw new Error('GitHub did not return a commit SHA.');

      if(packageResult.formRuntimeTokenHash){
        await stageWebsiteStudioFormDeploymentToken(sb,{
          projectId:data.projectId,
          target:formTokenTarget,
          tokenHash:packageResult.formRuntimeTokenHash,
          stagingRef:commitSha,
        });
      }

      await githubJson(token,`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,{
        method:'PATCH',
        body:JSON.stringify({sha:commitSha,force:false}),
      });

      if(packageResult.formRuntimeTokenHash){
        await promoteWebsiteStudioFormDeploymentToken(sb,{
          projectId:data.projectId,
          target:formTokenTarget,
          stagingRef:commitSha,
          activeRef:commitSha,
        });
      }

      const nextGit={
        ...git,
        connected:true,
        provider:'github',
        repository,
        branch,
        rootPath,
        lastSyncedCommit:commitSha,
        lastSyncedAt:new Date().toISOString(),
      };
      const {error:updateError}=await sb.from('website_studio_projects').update({git_config:nextGit,updated_at:new Date().toISOString()}).eq('id',data.projectId);
      if(updateError)throw new Error(updateError.message);

      await writeAudit({
        userId:context.userId,
        action:'website_studio.github.sync',
        targetType:'website_studio_project',
        targetId:data.projectId,
        status:'success',
        metadata:{
          repository,branch,root_path:rootPath||null,commit_sha:commitSha,
          file_count:packageResult.files.length,
          form_runtime_token_activated:Boolean(packageResult.formRuntimeTokenHash),
        },
      });

      return {
        provider:'github',
        repository,
        branch,
        rootPath,
        commitSha,
        commitUrl:`https://github.com/${owner}/${repo}/commit/${commitSha}`,
        fileCount:packageResult.files.length,
        gitConfig:nextGit,
      };
    }catch(error){
      await writeAudit({
        userId:context.userId,
        action:'website_studio.github.sync',
        targetType:'website_studio_project',
        targetId:data.projectId,
        status:'failed',
        metadata:{repository,branch,error:error instanceof Error?error.message.slice(0,300):'unknown'},
      });
      throw new Error(error instanceof Error?error.message:'GitHub sync failed.');
    }
  });
