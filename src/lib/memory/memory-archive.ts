/**
 * Blackstar's original, owner-governed memory explorer. Uses the existing
 * Memory Fabric, not OpenViking's AGPL source or AgentMemory's separate DB.
 * The directory and review lens are read-only projections of canonical rows.
 */
export type MemoryArchiveLayer = 'short_term'|'long_term'|'knowledge'|'organisation'
export type MemoryArchiveScope = 'private'|'user'|'agent'|'shared'|'organisation'
export type MemoryArchiveLens = MemoryArchiveLayer|'all'
export type ArchiveMemoryRow = {
  id:string; user_id?:string|null; title?:string|null; content:string;
  memory_type?:string|null; scope?:string|null; agent_id?:string|null;
  org_id?:string|null; importance?:string|null; pinned?:boolean|null;
  created_at?:string|null; updated_at?:string|null; expires_at?:string|null;
  category?:string|null; source?:string|null
}
export type ArchiveDocumentRow = {
  id:string; title?:string|null; agent_id?:string|null; org_id?:string|null;
  created_at?:string|null
}
export type ArchiveReviewKind = 'expired'|'possible_duplicate'|'short_term_stale'
export type ArchiveReview = {
  id:string; kind:ArchiveReviewKind; title:string; path:string; reason:string
}
export type ArchiveEntry = {
  id:string; path:string; kind:'memory'|'document'; layer:MemoryArchiveLayer;
  scope:MemoryArchiveScope; title:string; pinned:boolean; importance:string|null;
  recordedAt:string|null; expired:boolean; category:string|null
}
export type ArchiveFolder = {path:string;layer:MemoryArchiveLayer;count:number}
export type ArchiveOverview = {
  entries:ArchiveEntry[]; folders:ArchiveFolder[]; reviews:ArchiveReview[];
  counts:Record<MemoryArchiveLayer,number>; total:number;
  scanned:number; truncated:boolean
}

/** Metadata-only local navigation over an already authorised, bounded overview. */
export function filterMemoryArchiveEntries(entries:ArchiveEntry[], options:{
  query?:string; folderPath?:string; reviewKind?:ArchiveReviewKind|'all'; reviews?:ArchiveReview[];
} = {}):ArchiveEntry[] {
  const query=(options.query??'').trim().toLowerCase().slice(0,200)
  const folder=options.folderPath?.replace(/\/+$/,'')
  const reviewIds=options.reviewKind && options.reviewKind!=='all'
    ?new Set((options.reviews??[]).filter(row=>row.kind===options.reviewKind).map(row=>row.id)):null
  return entries.filter(row=>{
    if(folder && !row.path.startsWith(`${folder}/`))return false
    if(reviewIds && !reviewIds.has(row.id))return false
    return !query || [row.title,row.path,row.category,row.layer,row.scope,row.kind]
      .some(value=>String(value??'').toLowerCase().includes(query))
  })
}

const LAYERS:MemoryArchiveLayer[]=['short_term','long_term','knowledge','organisation']
const SCOPES:MemoryArchiveScope[]=['private','user','agent','shared','organisation']
const safeSegment=(value:string)=>value.toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,50)
export function archiveLayer(row:ArchiveMemoryRow):MemoryArchiveLayer {
  if (row.memory_type==='short_term') return 'short_term'
  if (row.memory_type==='knowledge') return 'knowledge'
  if (row.memory_type==='organisation' || row.scope==='shared' || row.scope==='organisation') return 'organisation'
  return 'long_term'
}
export function archiveScope(value:string|null|undefined):MemoryArchiveScope {
  return SCOPES.includes(value as MemoryArchiveScope)? value as MemoryArchiveScope:'private'
}
export function archivePath(row:ArchiveMemoryRow):string {
  const scope=archiveScope(row.scope)
  const layer=archiveLayer(row)
  const container=scope==='agent' ? `agent/${safeSegment(row.agent_id??'unassigned')}`
    : scope==='shared'||scope==='organisation' ? `workspace/${safeSegment(row.org_id??'unassigned')}`
      : scope
  return `blackstar://memory/${container}/${layer}/${row.id}`
}
export function buildMemoryArchiveOverview(input:{
  memories:ArchiveMemoryRow[]; documents?:ArchiveDocumentRow[];
  lens?:MemoryArchiveLens; now?:number; truncated?:boolean;
}):ArchiveOverview {
  const now=input.now??Date.now()
  const lens=input.lens??'all'
  const rows=input.memories.filter(row=>row && /^[0-9a-f-]{36}$/i.test(row.id))
  const docs=input.documents??[]
  const counts:Record<MemoryArchiveLayer,number>={short_term:0,long_term:0,knowledge:0,organisation:0}
  const seen=new Map<string,string>()
  const reviews:ArchiveReview[]=[]
  const entries:ArchiveEntry[]=[]
  const folders=new Map<string,ArchiveFolder>()
  const pushEntry=(entry:ArchiveEntry)=>{
    counts[entry.layer]++
    const root=entry.path.slice(0,entry.path.lastIndexOf('/'))
    const existing=folders.get(root)
    if(existing) existing.count++
    else folders.set(root,{path:root,layer:entry.layer,count:1})
    if(lens==='all'||lens===entry.layer)entries.push(entry)
  }
  for(const row of rows){
    const layer=archiveLayer(row),path=archivePath(row)
    const title=(row.title??row.category??'Untitled memory').slice(0,200)
    const expires=Date.parse(row.expires_at??'')
    const expired=Number.isFinite(expires)&&expires<=now
    const recordedAt=row.updated_at??row.created_at??null
    pushEntry({id:row.id,path,kind:'memory',layer,scope:archiveScope(row.scope),
      title,pinned:row.pinned===true,importance:row.importance??null,
      recordedAt,expired,category:row.category?.slice(0,60)??null})
    if (expired) {
      reviews.push({id:row.id,kind:'expired',path,title,reason:'This memory has passed its expiry time. Review using the existing delete or retention controls.'})
    }
    const normalized=row.content.trim().toLowerCase().replace(/\s+/g,' ')
    // Compare only within the same exact access boundary, never across agents or organisations.
    const boundary=JSON.stringify([row.user_id??null,archiveScope(row.scope),row.org_id??null,row.agent_id??null,layer])
    if(!expired && normalized.length>=24){
      const key=`${boundary}:${normalized}`
      if(seen.has(key)){
        reviews.push({id:row.id,kind:'possible_duplicate',path,title,
          reason:'This memory repeats existing content within the same scope. Review before consolidating.'})
      } else seen.set(key,row.id)
    }
    const updated=Date.parse(recordedAt??'')
    if(!expired && layer==='short_term' && Number.isFinite(updated) && now-updated>24*60*60*1000){
      reviews.push({id:row.id,kind:'short_term_stale',path,title,
        reason:'Short-term memory has not been updated for over a day. Review its relevance and retention.'})
    }
  }
  for(const doc of docs){
    if (!/^[0-9a-f-]{36}$/i.test(doc.id)) continue
    const scope:MemoryArchiveScope=doc.org_id?'organisation':doc.agent_id?'agent':'private'
    const container=scope==='agent'?`agent/${safeSegment(doc.agent_id??'unassigned')}`
      :scope==='organisation'?`workspace/${safeSegment(doc.org_id??'unassigned')}`:'private'
    pushEntry({id:doc.id,path:`blackstar://memory/${container}/knowledge/documents/${doc.id}`,
      kind:'document',layer:'knowledge',scope,title:(doc.title??'Untitled document').slice(0,200),
      pinned:false,importance:null,recordedAt:doc.created_at??null,expired:false,category:'document'})
  }
  return {
    entries:entries.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(b.recordedAt??'').localeCompare(String(a.recordedAt??''))),
    folders:[...folders.values()].sort((a,b)=>a.path.localeCompare(b.path)),
    reviews:reviews.filter(review=>lens==='all' || entries.some(row=>row.id===review.id)).slice(0,50),
    counts,total:Object.values(counts).reduce((a,b)=>a+b,0),scanned:input.memories.length+docs.length,truncated:input.truncated===true,
  }
}
