import { Buffer } from 'node:buffer';
import { buildWebsiteProjectManifest } from '@/lib/website-studio/website-project';
import { buildDeploymentAssetManifest, deploymentAssetPath, rewriteWebsiteAssetReferences } from '@/lib/website-studio/website-assets';

export type WebsitePackageFile={file:string;data:string;encoding:'utf-8'|'base64'};

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

  const manifest=buildWebsiteProjectManifest({
    name:project.name,
    slug:project.slug,
    framework:project.framework||'html',
    html:rewriteWebsiteAssetReferences(project.html||'',deploymentAssets),
    css:rewriteWebsiteAssetReferences(project.css||'',deploymentAssets),
    javascript:rewriteWebsiteAssetReferences(project.javascript||'',deploymentAssets),
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
