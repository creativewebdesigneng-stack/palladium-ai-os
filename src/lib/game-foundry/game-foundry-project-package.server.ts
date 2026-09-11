type SourceFile = { path:string; purpose:string; content:string };
type SourceManifest = { summary?:string; files?:SourceFile[]; setup?:string[]; verification?:string[]; generatedBy?:unknown };
type ExportAsset = { id:string; name:string; format:string; url:string; preferredSource:string; importPath:string; validation?:unknown };
type ExportManifest = { schema?:string; project?:unknown; importRoot?:string; assets?:ExportAsset[]; generatedAt?:string };

function safeFiles(value: unknown): SourceFile[] {
  if (!value || typeof value !== "object") return [];
  const files = (value as SourceManifest).files;
  if (!Array.isArray(files)) return [];
  return files
    .filter((file) => file && typeof file.path === "string" && typeof file.content === "string")
    .map((file) => ({
      path:file.path.replace(/^\/+/, ""),
      purpose:typeof file.purpose === "string" ? file.purpose : "",
      content:file.content,
    }));
}

export function buildGameFoundryProjectPackage(input: {
  project: {
    id:string;
    name:string;
    prompt:string;
    target_engine:string;
    project_type:string;
    quality_profile:string;
    design_spec:unknown;
    content_manifest?:unknown;
    source_manifest:unknown;
    export_manifest:unknown;
  };
}) {
  const source = (input.project.source_manifest && typeof input.project.source_manifest === "object"
    ? input.project.source_manifest
    : {}) as SourceManifest;
  const exports = (input.project.export_manifest && typeof input.project.export_manifest === "object"
    ? input.project.export_manifest
    : {}) as ExportManifest;
  const files = safeFiles(source);
  if (!files.length) throw new Error("Generate the Game Foundry engine source before preparing a project package.");

  const assets = Array.isArray(exports.assets) ? exports.assets : [];
  return {
    schema:"blackstar.game_foundry.project_package.v1",
    project:{
      id:input.project.id,
      name:input.project.name,
      prompt:input.project.prompt,
      targetEngine:input.project.target_engine,
      projectType:input.project.project_type,
      qualityProfile:input.project.quality_profile,
    },
    design:input.project.design_spec && typeof input.project.design_spec === "object" ? input.project.design_spec : {},
    content:input.project.content_manifest && typeof input.project.content_manifest === "object" ? input.project.content_manifest : {},
    source:{
      summary:typeof source.summary === "string" ? source.summary : "",
      files,
      setup:Array.isArray(source.setup) ? source.setup : [],
      verification:Array.isArray(source.verification) ? source.verification : [],
      generatedBy:source.generatedBy ?? null,
    },
    engineImport:{
      importRoot:typeof exports.importRoot === "string" ? exports.importRoot : null,
      assets,
      manifestSchema:typeof exports.schema === "string" ? exports.schema : null,
    },
    assembly:{
      sourceFileCount:files.length,
      linkedAssetCount:assets.length,
      includesBinaryAssets:false,
      note:"Binary 3D assets are referenced by their generated/processed URLs and import paths. This portable package does not fabricate or embed engine binaries.",
    },
    preparedAt:new Date().toISOString(),
  };
}

export function gameFoundryPackageFilename(name: string, engine: string) {
  const slug = (name || "game-project").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "game-project";
  const target = (engine || "generic").toLowerCase().replace(/[^a-z0-9-]+/g,"-");
  return `${slug}-${target}-blackstar-game-project.json`;
}
