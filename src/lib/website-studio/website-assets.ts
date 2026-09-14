export type WebsiteDeployAsset={id:string;name:string;storage_path?:string|null;source_url?:string|null};

export function safeAssetFilename(value:string):string{
  const cleaned=String(value||'asset').split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-+|-+$/g,'');
  return (cleaned||'asset').slice(-140);
}

export function deploymentAssetPath(asset:Pick<WebsiteDeployAsset,'id'|'name'>):string{
  return `assets/${asset.id}-${safeAssetFilename(asset.name)}`;
}

export function deploymentAssetUrl(asset:Pick<WebsiteDeployAsset,'id'|'name'>):string{
  return '/'+deploymentAssetPath(asset);
}

export function rewriteWebsiteAssetReferences(content:string,assets:WebsiteDeployAsset[]):string{
  let output=String(content||'');
  for(const asset of assets){
    const target=deploymentAssetUrl(asset);
    output=output.split(`blackstar-asset://${asset.id}`).join(target);
  }
  return output;
}

export function buildDeploymentAssetManifest(assets:WebsiteDeployAsset[]){
  return assets.map(asset=>({
    id:asset.id,
    name:asset.name,
    path:deploymentAssetUrl(asset),
    source:asset.storage_path?'uploaded':'external',
    externalUrl:asset.storage_path?null:(asset.source_url||null),
  }));
}
