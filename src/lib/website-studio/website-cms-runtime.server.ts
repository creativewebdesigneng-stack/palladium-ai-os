export type WebsiteCmsRuntimeFile={file:string;data:string;encoding:'utf-8'};
export type WebsiteCmsRuntimePackage={
  files:WebsiteCmsRuntimeFile[];
  javascript:string;
  collectionCount:number;
  publishedItemCount:number;
};

type CmsSb={from:(table:string)=>any};
type PublicCmsItem={slug:string;title:string;data:Record<string,unknown>;publishedAt:string|null};

const MAX_COLLECTIONS=32;
const MAX_ITEMS_PER_COLLECTION=500;
const MAX_ITEM_BYTES=131_072;
const MAX_CMS_BYTES=5_242_880;

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

export function normalizeWebsiteCmsCollectionKey(value:unknown):string{
  return String(value||'')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80);
}

export function configuredWebsiteCmsCollectionKeys(appConfig:unknown):string[]{
  const config=asRecord(appConfig);
  const collections=Array.isArray(config['collections'])?config['collections']:[];
  const keys:string[]=[];
  const seen=new Set<string>();
  for(const value of collections){
    const collection=asRecord(value);
    const key=normalizeWebsiteCmsCollectionKey(collection['key']??collection['name']);
    if(!key||seen.has(key))continue;
    seen.add(key);
    keys.push(key);
    if(keys.length>MAX_COLLECTIONS)throw new Error(`Website Studio supports up to ${MAX_COLLECTIONS} published CMS collections per deployment.`);
  }
  return keys.sort((left,right)=>left.localeCompare(right));
}

function publicItem(value:unknown):PublicCmsItem{
  const row=asRecord(value);
  const slug=typeof row['slug']==='string'?row['slug'].trim().slice(0,160):'';
  if(!slug)throw new Error('A published CMS item is missing its slug.');
  const title=typeof row['title']==='string'?row['title'].slice(0,240):'';
  const data=asRecord(row['data']);
  const publishedAt=typeof row['published_at']==='string'?row['published_at']:null;
  const item={slug,title,data,publishedAt};
  const bytes=Buffer.byteLength(JSON.stringify(item),'utf8');
  if(bytes>MAX_ITEM_BYTES)throw new Error(`Published CMS item "${slug}" exceeds the 128 KB per-item deployment limit.`);
  return item;
}

function cmsRuntime(keys:string[]):string{
  if(keys.length===0)return '';
  return `\n;(()=>{\nconst script=document.currentScript;\nconst base=script instanceof HTMLScriptElement&&script.src?new URL('.',script.src):new URL('./',location.href);\nconst configured=${JSON.stringify(keys)};\nconst cache=new Map();\nconst normalize=(value)=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);\nconst read=async(path)=>{if(cache.has(path))return cache.get(path);const promise=fetch(new URL(path,base),{headers:{accept:'application/json'}}).then(async(response)=>{if(!response.ok)throw new Error('cms_runtime_unavailable');return response.json();});cache.set(path,promise);try{return await promise}catch(error){cache.delete(path);throw error}};\nconst list=async(key)=>{const normalized=normalize(key);if(!normalized||!configured.includes(normalized))throw new Error('cms_collection_not_configured');const payload=await read('site/cms/'+encodeURIComponent(normalized)+'.json');return Array.isArray(payload?.items)?payload.items:[];};\nconst get=async(key,slug)=>{const items=await list(key);const normalized=String(slug||'').trim();return items.find((item)=>String(item?.slug||'')===normalized)||null;};\nwindow.BlackstarCMS=Object.freeze({version:1,collections:Object.freeze([...configured]),index:()=>read('site/cms/index.json'),list,get});\ndocument.dispatchEvent(new CustomEvent('blackstar:cms-ready',{detail:{collections:[...configured]}}));\n})();\n`;
}

export async function buildWebsiteCmsRuntimePackage(sb:CmsSb,project:any):Promise<WebsiteCmsRuntimePackage>{
  const keys=configuredWebsiteCmsCollectionKeys(project?.app_config);
  if(keys.length===0)return {files:[],javascript:'',collectionCount:0,publishedItemCount:0};

  const files:WebsiteCmsRuntimeFile[]=[];
  const indexCollections:Array<{key:string;path:string;count:number}>=[];
  let publishedItemCount=0;
  let totalBytes=0;

  for(const key of keys){
    let query=sb.from('website_studio_collection_items')
      .select('slug,title,data,published_at')
      .eq('project_id',project.id)
      .eq('collection_key',key)
      .eq('status','published');
    if(typeof project?.user_id==='string'&&project.user_id)query=query.eq('user_id',project.user_id);
    const {data,error}=await query.order('slug',{ascending:true}).limit(MAX_ITEMS_PER_COLLECTION+1);
    if(error)throw new Error(`Could not package CMS collection "${key}": ${error.message}`);
    const rows=Array.isArray(data)?data:[];
    if(rows.length>MAX_ITEMS_PER_COLLECTION){
      throw new Error(`CMS collection "${key}" exceeds the ${MAX_ITEMS_PER_COLLECTION} published-item deployment limit.`);
    }
    const items=rows.map(publicItem).sort((left,right)=>left.slug.localeCompare(right.slug));
    const path=`site/cms/${key}.json`;
    const dataJson=JSON.stringify({version:1,collection:key,items},null,2);
    totalBytes+=Buffer.byteLength(dataJson,'utf8');
    if(totalBytes>MAX_CMS_BYTES)throw new Error('Published CMS content exceeds the 5 MB Website Studio deployment limit.');
    files.push({file:path,data:dataJson,encoding:'utf-8'});
    indexCollections.push({key,path,count:items.length});
    publishedItemCount+=items.length;
  }

  const indexJson=JSON.stringify({version:1,collections:indexCollections},null,2);
  totalBytes+=Buffer.byteLength(indexJson,'utf8');
  if(totalBytes>MAX_CMS_BYTES)throw new Error('Published CMS content exceeds the 5 MB Website Studio deployment limit.');
  files.unshift({file:'site/cms/index.json',data:indexJson,encoding:'utf-8'});

  return {
    files,
    javascript:cmsRuntime(keys),
    collectionCount:keys.length,
    publishedItemCount,
  };
}
