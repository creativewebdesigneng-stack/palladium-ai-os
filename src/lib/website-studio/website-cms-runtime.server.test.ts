import {describe,expect,it} from 'vitest';
import {
  buildWebsiteCmsRuntimePackage,
  configuredWebsiteCmsCollectionKeys,
  normalizeWebsiteCmsCollectionKey,
} from './website-cms-runtime.server';
import {buildWebsiteRuntimePackage} from './website-package.server';

type Row=Record<string,unknown>;

function collectionQuery(rows:Row[],observed:Array<Array<[string,unknown]>>){
  const filters:Array<[string,unknown]>=[];
  const query:any={
    select:()=>query,
    eq:(column:string,value:unknown)=>{filters.push([column,value]);return query;},
    order:()=>query,
    limit:async(limit:number)=>{
      observed.push([...filters]);
      const data=rows.filter(row=>filters.every(([column,value])=>row[column]===value)).slice(0,limit);
      return {data,error:null};
    },
  };
  return query;
}

function createCmsSupabase(rows:Row[]){
  const observed:Array<Array<[string,unknown]>>=[];
  const sb:any={
    from:(table:string)=>{
      if(table==='website_studio_collection_items')return collectionQuery(rows,observed);
      if(table==='website_studio_assets')return {select:()=>({eq:async()=>({data:[],error:null})})};
      throw new Error(`Unexpected table ${table}`);
    },
    storage:{from:()=>({download:async()=>({data:null,error:{message:'not used'}})})},
  };
  return {sb,observed};
}

const project={
  id:'11111111-1111-4111-8111-111111111111',
  user_id:'22222222-2222-4222-8222-222222222222',
  name:'CMS site',slug:'cms-site',framework:'html',
  html:'<!doctype html><html><body><script src="/script.js"></script></body></html>',
  css:'',javascript:'',pages:[
    {name:'Home',path:'/',html:'<!doctype html><html><body>Home<script src="/script.js"></script></body></html>'},
    {name:'Blog',path:'/blog',html:'<!doctype html><html><body>Blog<script src="/script.js"></script></body></html>'},
  ],
  design_tokens:{},brief:{},
  app_config:{collections:[{name:'Blog Posts'},{name:'News'}]},
};

const rows:Row[]=[
  {project_id:project.id,user_id:project.user_id,collection_key:'blog-posts',slug:'alpha',title:'Alpha',data:{body:'Published'},status:'published',published_at:'2026-09-14T10:00:00.000Z',id:'internal-a'},
  {project_id:project.id,user_id:project.user_id,collection_key:'blog-posts',slug:'draft',title:'Draft',data:{body:'Private'},status:'draft',published_at:null,id:'internal-draft'},
  {project_id:project.id,user_id:project.user_id,collection_key:'news',slug:'release',title:'Release',data:{body:'News'},status:'published',published_at:'2026-09-14T11:00:00.000Z',id:'internal-news'},
  {project_id:project.id,user_id:'33333333-3333-4333-8333-333333333333',collection_key:'blog-posts',slug:'other-owner',title:'Other',data:{body:'No'},status:'published',published_at:'2026-09-14T11:00:00.000Z'},
  {project_id:'44444444-4444-4444-8444-444444444444',user_id:project.user_id,collection_key:'blog-posts',slug:'other-project',title:'Other',data:{body:'No'},status:'published',published_at:'2026-09-14T11:00:00.000Z'},
  {project_id:project.id,user_id:project.user_id,collection_key:'secret',slug:'not-configured',title:'Secret',data:{body:'No'},status:'published',published_at:'2026-09-14T11:00:00.000Z'},
];

describe('Website Studio published CMS runtime',()=>{
  it('normalizes and deduplicates configured collection keys deterministically',()=>{
    expect(normalizeWebsiteCmsCollectionKey('  Blog Posts  ')).toBe('blog-posts');
    expect(configuredWebsiteCmsCollectionKeys({collections:[{name:'Blog Posts'},{name:'blog posts'},{key:'News'}]})).toEqual(['blog-posts','news']);
  });

  it('exports only published configured items for the current project owner',async()=>{
    const {sb,observed}=createCmsSupabase(rows);
    const result=await buildWebsiteCmsRuntimePackage(sb,project);
    expect(result.collectionCount).toBe(2);
    expect(result.publishedItemCount).toBe(2);
    expect(result.files.map(file=>file.file)).toEqual([
      'site/cms/index.json',
      'site/cms/blog-posts.json',
      'site/cms/news.json',
    ]);

    const blog=JSON.parse(result.files.find(file=>file.file==='site/cms/blog-posts.json')!.data);
    expect(blog.items).toEqual([{slug:'alpha',title:'Alpha',data:{body:'Published'},publishedAt:'2026-09-14T10:00:00.000Z'}]);
    expect(result.files.some(file=>file.data.includes('Private'))).toBe(false);
    expect(result.files.some(file=>file.data.includes('internal-a'))).toBe(false);
    expect(result.files.some(file=>file.data.includes('other-owner'))).toBe(false);
    expect(result.files.some(file=>file.data.includes('not-configured'))).toBe(false);
    expect(observed.every(filters=>filters.some(([column,value])=>column==='status'&&value==='published'))).toBe(true);
    expect(observed.every(filters=>filters.some(([column,value])=>column==='project_id'&&value===project.id))).toBe(true);
    expect(observed.every(filters=>filters.some(([column,value])=>column==='user_id'&&value===project.user_id))).toBe(true);
  });

  it('adds one shared BlackstarCMS runtime and snapshots to the normal Website Studio package',async()=>{
    const {sb}=createCmsSupabase(rows);
    const result=await buildWebsiteRuntimePackage(sb,project);
    const script=result.files.find(file=>file.file==='script.js')?.data||'';
    expect(script).toContain('window.BlackstarCMS');
    expect(script).toContain("'blackstar:cms-ready'");
    expect(result.files.filter(file=>file.file==='script.js')).toHaveLength(1);
    expect(result.files.some(file=>file.file==='blog/index.html')).toBe(true);
    expect(result.files.some(file=>file.file==='site/cms/index.json')).toBe(true);
    expect(result.cmsCollectionCount).toBe(2);
    expect(result.cmsPublishedItemCount).toBe(2);
  });

  it('does not query CMS tables or emit a runtime when no collections are configured',async()=>{
    const sb:any={from:()=>{throw new Error('CMS query should not run')}};
    const result=await buildWebsiteCmsRuntimePackage(sb,{...project,app_config:{}});
    expect(result).toEqual({files:[],javascript:'',collectionCount:0,publishedItemCount:0});
  });

  it('fails closed when a configured collection exceeds the published item limit',async()=>{
    const tooMany=Array.from({length:501},(_,index)=>({
      project_id:project.id,user_id:project.user_id,collection_key:'blog-posts',slug:`post-${index}`,title:'Post',data:{},status:'published',published_at:null,
    }));
    const {sb}=createCmsSupabase(tooMany);
    await expect(buildWebsiteCmsRuntimePackage(sb,{...project,app_config:{collections:[{name:'Blog Posts'}]}}))
      .rejects.toThrow('500 published-item deployment limit');
  });
});
