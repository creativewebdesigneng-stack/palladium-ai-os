type Project = {
  id:string;
  name:string;
  target_engine:string;
  quality_profile:string;
  status:string;
  design_spec:unknown;
  content_manifest:unknown;
  content_status:string;
  source_manifest:unknown;
  source_status:string;
  package_manifest:unknown;
  package_status:string;
  export_manifest:unknown;
  handoff_status:string;
  output_url:string|null;
};

type Asset = {
  id:string;
  content_requirement_id:string|null;
  status:string;
  output_url:string|null;
  processed_output_url:string|null;
  processing_status:string;
  validation_report:unknown;
};

const THREE_D_KINDS=new Set(["environment","character","prop","vehicle","weapon"]);

function objectHasKeys(value:unknown) {
  return Boolean(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value as Record<string,unknown>).length);
}

function sourceFiles(value:unknown):Array<{path?:unknown}> {
  if(!value||typeof value!=="object") return [];
  const files=(value as {files?:unknown}).files;
  return Array.isArray(files)?files as Array<{path?:unknown}>:[];
}

function contentRequirements(value:unknown):Array<{id?:unknown;kind?:unknown;name?:unknown}> {
  if(!value||typeof value!=="object") return [];
  const requirements=(value as {assetRequirements?:unknown}).assetRequirements;
  return Array.isArray(requirements)?requirements as Array<{id?:unknown;kind?:unknown;name?:unknown}>:[];
}

export function auditGameFoundryReadiness(project:Project, assets:Asset[]) {
  const required3d=contentRequirements(project.content_manifest)
    .filter((item)=>typeof item.id==="string"&&THREE_D_KINDS.has(String(item.kind)))
    .map((item)=>({id:String(item.id),name:typeof item.name==="string"?item.name:String(item.id)}));
  const jobsByRequirement=new Map(assets.filter((asset)=>asset.content_requirement_id).map((asset)=>[String(asset.content_requirement_id),asset]));
  const missingAssets=required3d.filter((req)=>!jobsByRequirement.has(req.id));
  const incompleteAssets=required3d.filter((req)=>{
    const asset=jobsByRequirement.get(req.id);
    return asset&&!(asset.status==="completed"&&Boolean(asset.output_url));
  });
  const qualityNeedsProcessing=["game_ready","cinematic"].includes(project.quality_profile);
  const unprocessedAssets=qualityNeedsProcessing
    ? required3d.filter((req)=>{
        const asset=jobsByRequirement.get(req.id);
        return asset?.status==="completed"&&asset.processing_status!=="completed";
      })
    : [];

  const files=sourceFiles(project.source_manifest);
  const webEntry=files.some((file)=>typeof file.path==="string"&&/(^|\/)index\.html$/i.test(file.path));
  const packageCore={
    design:objectHasKeys(project.design_spec),
    content:project.content_status==="generated"&&objectHasKeys(project.content_manifest),
    source:project.source_status==="generated"&&files.length>0,
    package:project.package_status==="prepared"&&objectHasKeys(project.package_manifest),
    requiredAssets:missingAssets.length===0&&incompleteAssets.length===0,
    gameReadyAssets:unprocessedAssets.length===0,
  };
  const packageReady=Object.values(packageCore).every(Boolean);
  const runtimeReady=project.target_engine==="web"
    ? packageReady&&webEntry
    : packageReady&&project.status==="completed"&&Boolean(project.output_url);
  const handoffReady=packageReady&&objectHasKeys(project.export_manifest)&&["prepared","queued","running","completed"].includes(project.handoff_status);
  const blockers:string[]=[];
  if(!packageCore.design) blockers.push("Generate and approve the game design.");
  if(!packageCore.content) blockers.push("Generate the gameplay/world content manifest.");
  if(!packageCore.source) blockers.push("Generate bounded engine source.");
  if(!packageCore.package) blockers.push("Prepare the portable project package.");
  for(const req of missingAssets) blockers.push(`Create required 3D asset: ${req.name}.`);
  for(const req of incompleteAssets) if(!missingAssets.some((missing)=>missing.id===req.id)) blockers.push(`Complete required 3D asset: ${req.name}.`);
  for(const req of unprocessedAssets) blockers.push(`Finish game-ready processing for: ${req.name}.`);
  if(packageReady&&project.target_engine==="web"&&!webEntry) blockers.push("Generate a Web source manifest containing index.html.");
  if(packageReady&&project.target_engine!=="web"&&!runtimeReady) blockers.push("Complete a real external game build before runtime-ready status.");
  return {
    status:runtimeReady?"runtime_ready":packageReady?"package_ready":"blocked",
    packageReady,
    runtimeReady,
    handoffReady,
    checks:{
      ...packageCore,
      webEntry:project.target_engine==="web"?webEntry:null,
      externalBuild:project.target_engine==="web"?null:project.status==="completed"&&Boolean(project.output_url),
      handoff:handoffReady,
    },
    counts:{
      required3dAssets:required3d.length,
      linkedRequiredAssets:required3d.length-missingAssets.length,
      completedRequiredAssets:required3d.filter((req)=>jobsByRequirement.get(req.id)?.status==="completed").length,
      processedRequiredAssets:required3d.filter((req)=>jobsByRequirement.get(req.id)?.processing_status==="completed").length,
    },
    blockers,
    auditedAt:new Date().toISOString(),
    note:"Readiness is derived from persisted Blackstar evidence. It does not claim an external engine build or bridge succeeded unless that state is actually recorded.",
  };
}
