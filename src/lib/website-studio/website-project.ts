export type WebsiteProjectFile={path:string;content:string;kind:'html'|'css'|'javascript'|'json'|'text'};
export type WebsiteProjectManifest={version:1;name:string;slug:string;framework:string;files:WebsiteProjectFile[]};

export function buildWebsiteProjectManifest(input:{
  name:string;slug:string;framework:string;html:string;css:string;javascript:string;pages:unknown[];designTokens:Record<string,unknown>;brief:Record<string,unknown>;
}):WebsiteProjectManifest{
  return {
    version:1,
    name:input.name,
    slug:input.slug,
    framework:input.framework||'html',
    files:[
      {path:'index.html',content:input.html||'',kind:'html'},
      {path:'styles.css',content:input.css||'',kind:'css'},
      {path:'script.js',content:input.javascript||'',kind:'javascript'},
      {path:'site/pages.json',content:JSON.stringify(input.pages||[],null,2),kind:'json'},
      {path:'site/design-tokens.json',content:JSON.stringify(input.designTokens||{},null,2),kind:'json'},
      {path:'site/brief.json',content:JSON.stringify(input.brief||{},null,2),kind:'json'},
      {path:'README.md',content:`# ${input.name}\n\nGenerated and edited in Blackstar Website Studio. Review content, integrations and deployment settings before publishing.\n`,kind:'text'},
    ],
  };
}

export function websiteManifestTree(manifest:WebsiteProjectManifest):string[]{
  return manifest.files.map(file=>file.path).sort((a,b)=>a.localeCompare(b));
}
