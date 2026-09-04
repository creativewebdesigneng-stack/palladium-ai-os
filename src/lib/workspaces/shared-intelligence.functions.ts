import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { buildBlackstarSharedWorkspacePlan } from '@/lib/ai-hub/shared-workspace'
import { buildIntelligenceGraph } from '@/lib/ai-hub/intelligence-graph'

type Sb = { from: (table: string) => any }

const graphInput = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  minConfidence: z.number().min(0).max(1).default(0.6),
  maxNodes: z.number().int().min(1).max(500).default(250),
  maxEdges: z.number().int().min(1).max(1500).default(750),
})

const collaborationInput = z.object({
  members: z.array(z.object({
    id: z.string().trim().min(1).max(160),
    kind: z.enum(['human', 'agent']),
    role: z.enum(['owner', 'collaborator', 'observer', 'agent']),
  })).max(100).default([]),
  requests: z.array(z.object({
    actorId: z.string().trim().min(1).max(160),
    action: z.enum(['read', 'comment', 'propose', 'edit', 'execute', 'approve', 'share']),
    resourceId: z.string().trim().max(200).optional(),
    purpose: z.string().trim().max(1000).optional(),
  })).min(1).max(100),
  allowAgentEdits: z.boolean().default(false),
  allowAgentExecution: z.boolean().default(false),
  allowExternalSharing: z.boolean().default(false),
  requireHumanApprovalForAgentMutations: z.boolean().default(true),
})

export function validateWorkspaceGraphInput(input: unknown) {
  return graphInput.parse(input ?? {})
}

export function validateWorkspaceCollaborationInput(input: unknown) {
  return collaborationInput.parse(input)
}

export const getWorkspaceIntelligenceGraph = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateWorkspaceGraphInput)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    let workspaceQuery = sb.from('agent_workspaces')
      .select('id,title,objective,status,project_id,agent_id,updated_at')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (data.workspaceId) workspaceQuery = workspaceQuery.eq('id', data.workspaceId)

    let cardQuery = sb.from('context_timeline_cards')
      .select('id,workspace_id,card_kind,title,tags,source_kind,source_id,knowledge_document_id,pinned,updated_at')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false })
      .limit(300)
    if (data.workspaceId) cardQuery = cardQuery.eq('workspace_id', data.workspaceId)

    const [workspaceResult, cardResult] = await Promise.all([workspaceQuery, cardQuery])
    if (workspaceResult.error) throw new Error(workspaceResult.error.message)
    if (cardResult.error) throw new Error(cardResult.error.message)

    const workspaces = workspaceResult.data ?? []
    const cards = cardResult.data ?? []
    const nodes: Array<{ id: string; domain: string; label: string; confidence: number; provenanceIds?: string[] }> = []
    const edges: Array<{ id: string; from: string; to: string; relation: string; confidence: number; provenanceIds?: string[] }> = []

    for (const workspace of workspaces) {
      const id = `workspace:${String(workspace.id)}`
      nodes.push({ id, domain: 'workspace', label: String(workspace.title ?? 'Untitled workspace'), confidence: 1 })
      if (workspace.project_id) {
        const projectId = `project:${String(workspace.project_id)}`
        nodes.push({ id: projectId, domain: 'project', label: `Project ${String(workspace.project_id).slice(0, 8)}`, confidence: 0.9 })
        edges.push({ id: `${id}->${projectId}`, from: id, to: projectId, relation: 'belongs_to_project', confidence: 0.9 })
      }
      if (workspace.agent_id) {
        const agentId = `agent:${String(workspace.agent_id)}`
        nodes.push({ id: agentId, domain: 'agent', label: `Agent ${String(workspace.agent_id).slice(0, 8)}`, confidence: 0.9 })
        edges.push({ id: `${id}->${agentId}`, from: id, to: agentId, relation: 'assigned_agent', confidence: 0.9 })
      }
    }

    for (const card of cards) {
      const id = `context:${String(card.id)}`
      const provenanceIds = card.knowledge_document_id ? [String(card.knowledge_document_id)] : []
      nodes.push({
        id,
        domain: `context:${String(card.card_kind ?? 'note')}`,
        label: String(card.title ?? 'Untitled context'),
        confidence: card.pinned || card.knowledge_document_id ? 0.95 : 0.8,
        ...(provenanceIds.length ? { provenanceIds } : {}),
      })
      if (card.workspace_id) {
        const workspaceId = `workspace:${String(card.workspace_id)}`
        edges.push({ id: `${id}->${workspaceId}`, from: id, to: workspaceId, relation: 'context_for', confidence: 0.95, ...(provenanceIds.length ? { provenanceIds } : {}) })
      }
      for (const tag of Array.isArray(card.tags) ? card.tags.slice(0, 10) : []) {
        const normalized = String(tag).trim().toLowerCase()
        if (!normalized) continue
        const tagId = `tag:${normalized}`
        nodes.push({ id: tagId, domain: 'tag', label: normalized, confidence: 0.85 })
        edges.push({ id: `${id}->${tagId}`, from: id, to: tagId, relation: 'tagged_with', confidence: 0.85 })
      }
      if (card.source_kind && card.source_id) {
        const sourceId = `source:${String(card.source_kind)}:${String(card.source_id)}`
        nodes.push({ id: sourceId, domain: `source:${String(card.source_kind)}`, label: `${String(card.source_kind)} source`, confidence: 0.8 })
        edges.push({ id: `${id}->${sourceId}`, from: id, to: sourceId, relation: 'derived_from', confidence: 0.8 })
      }
    }

    const dedupeNodes = [...new Map(nodes.map((node) => [node.id, node])).values()]
    const graph = buildIntelligenceGraph(dedupeNodes, edges, {
      minConfidence: data.minConfidence,
      maxNodes: data.maxNodes,
      maxEdges: data.maxEdges,
    })

    return {
      graph,
      summary: {
        workspaceCount: workspaces.length,
        contextCount: cards.length,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        provenanceLinkedNodes: graph.nodes.filter((node) => (node.provenanceIds?.length ?? 0) > 0).length,
      },
    }
  })

export const planWorkspaceCollaboration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateWorkspaceCollaborationInput)
  .handler(async ({ data, context }) => {
    const members = data.members.filter((member) => member.id !== context.userId)
    return buildBlackstarSharedWorkspacePlan(data.requests, {
      ownerId: context.userId,
      members: [{ id: context.userId, kind: 'human', role: 'owner' }, ...members],
      allowAgentEdits: data.allowAgentEdits,
      allowAgentExecution: data.allowAgentExecution,
      allowExternalSharing: data.allowExternalSharing,
      requireHumanApprovalForAgentMutations: data.requireHumanApprovalForAgentMutations,
      maximumActions: 100,
    })
  })
