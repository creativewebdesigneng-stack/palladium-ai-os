import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { buildMemoryArchiveOverview, type ArchiveMemoryRow, type ArchiveDocumentRow } from './memory-archive'

type Sb={from:(table:string)=>any}
const INPUT=z.object({lens:z.enum(['all','short_term','long_term','organisation','knowledge']).default('all')})

/**
 * Authenticated view over existing RLS-protected memory and knowledge stores.
 * No ingestion, copying, worker spawning, exfiltration or duplicate memory DB.
 * Status is derived from real Supabase rows, not simulated sidecar health.
 */
export const getMemoryArchive = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>INPUT.parse(input??{}))
  .handler(async ({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const [memoryResult,documentResult]=await Promise.all([
      sb.from('agent_memories')
        .select('id,user_id,title,content,memory_type,scope,agent_id,org_id,importance,pinned,created_at,updated_at,expires_at,category,source')
        .eq('user_id',context.userId)
        .order('updated_at',{ascending:false})
        .limit(501),
      sb.from('memory_documents')
        .select('id,title,agent_id,org_id,created_at')
        .eq('user_id',context.userId)
        .order('created_at',{ascending:false})
        .limit(201),
    ])
    if(memoryResult.error||documentResult.error){
      throw new Error('Could not verify access to your Memory Fabric records.')
    }
    const memories=(memoryResult.data??[]) as ArchiveMemoryRow[]
    const documents=(documentResult.data??[]) as ArchiveDocumentRow[]
    // This lens intentionally returns only metadata and review reasons. Raw memory
    // bodies remain behind existing authorised recall/edit/delete paths.
    const overview=buildMemoryArchiveOverview({
      memories:memories.slice(0,500),
      documents:documents.slice(0,200),
      lens:data.lens,
      truncated:memories.length>500||documents.length>200,
    })
    return {
      ...overview,authority:'blackstar-memory-fabric' as const,
      externalServices:{
        agentmemory:{mode:'not-connected' as const,reason:'External sidecar requires a reviewed per-tenant adapter.'},
        openviking:{mode:'not-connected' as const,reason:'AGPL and tenant authorization review required before enabling an external server.'},
      },
    }
  })
