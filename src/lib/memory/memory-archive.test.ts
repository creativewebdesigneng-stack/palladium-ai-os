import { describe,expect,it } from 'vitest'
import { archivePath, buildMemoryArchiveOverview, filterMemoryArchiveEntries } from './memory-archive'

const UUIDS=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003']
const now=Date.parse('2026-10-13T12:00:00.000Z')
const base={user_id:'owner',memory_type:'long_term',scope:'private',
  content:'A detailed reusable project context note',title:'Project note',
  updated_at:'2026-10-12T11:00:00.000Z',importance:'medium'} as const

describe('Blackstar governed memory archive',()=>{
  it('creates virtual folder paths without writing to an external memory database',()=>{
    expect(archivePath({...base,id:UUIDS[0]!})).toBe(`blackstar://memory/private/long_term/${UUIDS[0]}`)
    expect(archivePath({...base,id:UUIDS[1]!,scope:'agent',agent_id:UUIDS[0]!}))
      .toBe(`blackstar://memory/agent/${UUIDS[0]}/long_term/${UUIDS[1]}`)
  })
  it('keeps workspace and agent data in distinct virtual folders',()=>{
    const rows=[
      {...base,id:UUIDS[0]!,scope:'private'},
      {...base,id:UUIDS[1]!,scope:'agent',agent_id:UUIDS[0]!},
      {...base,id:UUIDS[2]!,scope:'organisation',org_id:UUIDS[1]!},
    ]
    const v=buildMemoryArchiveOverview({memories:rows,now})
    expect(new Set(v.entries.map(e=>e.path))).toHaveProperty('size',3)
    expect(v.entries.find(e=>e.id===UUIDS[2])?.path).toContain('/workspace/')
    expect(v.reviews.some(r=>r.kind==='possible_duplicate')).toBe(false)
  })
  it('only proposes duplicate consolidation within the identical access boundary',()=>{
    const a={...base,id:UUIDS[0]!}
    const b={...base,id:UUIDS[1]!,content:'  a DETAILED reusable project context note  '}
    const c={...base,id:UUIDS[2]!,scope:'agent',agent_id:UUIDS[0]!}
    const result=buildMemoryArchiveOverview({memories:[a,b,c],now})
    expect(result.reviews.filter(r=>r.kind==='possible_duplicate').map(r=>r.id)).toEqual([UUIDS[1]])
  })
  it('surfaces expiry and stale short-term suggestions without deleting records',()=>{
    const a={...base,id:UUIDS[0]!,expires_at:'2026-10-01T00:00:00.000Z'}
    const b={...base,id:UUIDS[1]!,memory_type:'short_term',content:'Another memory note for review'}
    const result=buildMemoryArchiveOverview({memories:[a,b],now})
    expect(result.reviews.map(r=>r.kind)).toEqual(['expired','short_term_stale'])
    expect(result.total).toBe(2)
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]?.kind).toBe('memory')
  })
  it('never includes document bodies or sensitive memory content in returned projections',()=>{
    const body='secret-content-should-never-be-in-archive-output'
    const result=buildMemoryArchiveOverview({memories:[{...base,id:UUIDS[0]!,content:body}],
      documents:[{id:UUIDS[1]!,title:'Document'}],now})
    expect(JSON.stringify(result)).not.toContain(body)
    expect(result.counts.knowledge).toBe(1)
    expect(result.total).toBe(2)
  })
  it('honours a layer lens without misreporting overall scanned counts',()=>{
    const result=buildMemoryArchiveOverview({memories:[
      {...base,id:UUIDS[0]!},
      {...base,id:UUIDS[1]!,memory_type:'short_term',content:'This is another unrelated note'},
    ],lens:'short_term',now})
    expect(result.entries.map(row=>row.id)).toEqual([UUIDS[1]])
    expect(result.counts.long_term).toBe(1)
    expect(result.total).toBe(2)
    expect(result.truncated).toBe(false)
  })
  it('never proposes duplicate consolidation across different record owners',()=>{
    const result=buildMemoryArchiveOverview({memories:[{...base,id:UUIDS[0]!,user_id:'owner-A'},{...base,id:UUIDS[1]!,user_id:'owner-B'}],now})
    expect(result.reviews).toEqual([])
  })
  it('counts only valid projected records while reporting every inspected input',()=>{
    const result=buildMemoryArchiveOverview({memories:[{...base,id:UUIDS[0]!},{...base,id:'invalid'}],documents:[{id:'invalid'}],now})
    expect(result.total).toBe(1)
    expect(result.scanned).toBe(3)
  })
  it('drills into an exact folder boundary and searches metadata without body access',()=>{
    const overview=buildMemoryArchiveOverview({memories:[
      {...base,id:UUIDS[0]!,scope:'agent',agent_id:'alpha',title:'Launch checklist'},
      {...base,id:UUIDS[1]!,scope:'agent',agent_id:'alpha-other',title:'Other checklist'},
      {...base,id:UUIDS[2]!,content:'private-body-only-search-term',title:'Unrelated'},
    ],now})
    const folder=overview.folders.find(row=>row.path.includes('/agent/alpha/'))!.path
    expect(filterMemoryArchiveEntries(overview.entries,{folderPath:folder,query:'LAUNCH'}).map(row=>row.id)).toEqual([UUIDS[0]])
    expect(filterMemoryArchiveEntries(overview.entries,{query:'private-body-only-search-term'})).toEqual([])
  })
  it('filters lifecycle suggestions without changing canonical records or review data',()=>{
    const overview=buildMemoryArchiveOverview({memories:[
      {...base,id:UUIDS[0]!,expires_at:'2026-10-01T00:00:00Z'},
      {...base,id:UUIDS[1]!,memory_type:'short_term'},
    ],now})
    const before=JSON.stringify(overview)
    expect(filterMemoryArchiveEntries(overview.entries,{reviews:overview.reviews,reviewKind:'expired'}).map(row=>row.id)).toEqual([UUIDS[0]])
    expect(filterMemoryArchiveEntries(overview.entries,{reviews:overview.reviews,reviewKind:'short_term_stale'}).map(row=>row.id)).toEqual([UUIDS[1]])
    expect(JSON.stringify(overview)).toBe(before)
  })
})
