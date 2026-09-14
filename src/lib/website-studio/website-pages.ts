export type WebsitePage={name:string;path:string;title?:string;description?:string;sections?:string[];status?:'draft'|'ready'};
export function normalizePagePath(value:string):string{
  const raw=String(value||'').trim().toLowerCase();
  if(!raw||raw==='/')return '/';
  const cleaned=raw.replace(/^\/+|\/+$/g,'').replace(/[^a-z0-9/_-]+/g,'-').replace(/-+/g,'-');
  return '/'+cleaned;
}
export function addWebsitePage(pages:WebsitePage[],name:string,path?:string):WebsitePage[]{
  const pagePath=normalizePagePath(path||name);
  if(pages.some(p=>normalizePagePath(p.path)===pagePath))return pages;
  return [...pages,{name:name.trim()||'Untitled page',path:pagePath,title:name.trim()||'Untitled page',description:'',sections:[],status:'draft'}];
}
export function removeWebsitePage(pages:WebsitePage[],path:string):WebsitePage[]{
  const target=normalizePagePath(path);
  if(target==='/')return pages;
  return pages.filter(p=>normalizePagePath(p.path)!==target);
}
