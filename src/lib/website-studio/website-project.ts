import { buildWebsiteRobots, buildWebsiteSitemap } from './website-seo';
export type WebsiteProjectFile={path:string;content:string;kind:'html'|'css'|'javascript'|'json'|'text'};
export type WebsiteProjectManifest={version:1;name:string;slug:string;framework:string;files:WebsiteProjectFile[]};

export function buildWebsiteProjectManifest(input:{
  name:string;slug:string;framework:string;html:string;css:string;javascript:string;pages:unknown[];designTokens:Record<string,unknown>;brief:Record<string,unknown>;appConfig?:Record<string,unknown>;
}):WebsiteProjectManifest{
  const seo=(input.brief?.['seo']&&typeof input.brief['seo']==='object'?input.brief['seo']:{}) as Record<string,unknown>;
  const sitemap=buildWebsiteSitemap(seo,input.pages as Array<{name?:string;path?:string}>);
  const robots=buildWebsiteRobots(seo);
  const seoFiles:WebsiteProjectFile[]=[
    {path:'robots.txt',content:robots,kind:'text'},
    ...(sitemap?[{path:'sitemap.xml',content:sitemap,kind:'text'} as WebsiteProjectFile]:[]),
  ];
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
      {path:'site/app-config.json',content:JSON.stringify(input.appConfig||{},null,2),kind:'json'},
      ...seoFiles,
      {path:'README.md',content:`# ${input.name}\n\nGenerated and edited in Blackstar Website Studio. Review content, integrations and deployment settings before publishing.\n`,kind:'text'},
    ],
  };
}

export function websiteManifestTree(manifest:WebsiteProjectManifest):string[]{
  return manifest.files.map(file=>file.path).sort((a,b)=>a.localeCompare(b));
}
