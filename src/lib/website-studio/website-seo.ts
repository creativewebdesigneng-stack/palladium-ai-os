export type WebsiteSeoConfig={title?:string;description?:string;canonicalBaseUrl?:string;indexable?:boolean;ogImage?:string};
export type WebsiteSeoPage={name?:string;path?:string};

export function normalizeBaseUrl(value:string):string{
  const raw=String(value||'').trim();
  if(!raw)return '';
  try{return new URL(raw).origin}catch{return ''}
}

export function buildWebsiteSitemap(config:WebsiteSeoConfig,pages:WebsiteSeoPage[]):string{
  const base=normalizeBaseUrl(config.canonicalBaseUrl||'');
  if(!base)return '';
  const urls=(pages||[]).map(page=>{
    const path=String(page.path||'/');
    const href=path==='/'?base:base+'/'+path.replace(/^\/+|\/+$/g,'');
    return `  <url><loc>${href}</loc></url>`;
  });
  return ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...urls,'</urlset>'].join('\n');
}

export function buildWebsiteRobots(config:WebsiteSeoConfig):string{
  const base=normalizeBaseUrl(config.canonicalBaseUrl||'');
  const indexable=config.indexable!==false;
  return [
    'User-agent: *',
    indexable?'Allow: /':'Disallow: /',
    ...(base&&indexable?[`Sitemap: ${base}/sitemap.xml`]:[]),
  ].join('\n');
}

export function assessWebsiteSeo(config:WebsiteSeoConfig,pages:WebsiteSeoPage[]){
  const checks=[
    {id:'title',ok:Boolean(config.title&&config.title.trim().length>=10&&config.title.trim().length<=65),detail:'Use a descriptive site title between 10 and 65 characters.'},
    {id:'description',ok:Boolean(config.description&&config.description.trim().length>=50&&config.description.trim().length<=170),detail:'Use a meta description between 50 and 170 characters.'},
    {id:'canonical',ok:Boolean(normalizeBaseUrl(config.canonicalBaseUrl||'')),detail:'Add a valid canonical base URL before publishing.'},
    {id:'pages',ok:Array.isArray(pages)&&pages.length>0,detail:'Define at least one page.'},
  ];
  return {score:Math.round((checks.filter(c=>c.ok).length/checks.length)*100),checks};
}
