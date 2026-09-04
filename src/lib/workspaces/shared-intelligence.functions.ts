import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { buildBlackstarSharedWorkspacePlan, type BlackstarWorkspaceActionRequest } from '@/lib/ai-hub/shared-workspace'
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
      .limit(400)
    if (data.workspaceId) cardQuery = cardQuery.eq('workspace_id', data.workspaceId)

    const [{ data: workspaceRows, error: workspaceError }, { data: cardRows, error: cardError }] = await Promise.all([
      workspaceQuery,
      cardQuery,
    ])
    if (workspaceError) throw new Error(workspaceError.message)
    if (cardError) throw new Error(cardError.message)

    const workspaces = workspaceRows ?? []
    const cards = cardRows ?? []
    const nodes: Array<{ id: string; domain: string; label: string; confidence: number; provenanceIds?: string[] }> = []
    const edges: Array<{ id: string; from: string; to: string; relation: string; confidence: number; provenanceIds?: string[] }> = []
    const seenNodes = new Set<string>()

    const addNode = (node: (typeof nodes)[number]) => {
      if (seenNodes.has(node.id)) return
      seenNodes.add(node.id)
      nodes.push(node)
    }

    for (const workspace of workspaces) {
      const workspaceId = String(workspace.id)
      const workspaceNode = `workspace:${workspaceId}`
      addNode({ id: workspaceNode, domain: 'workspace', label: String(workspace.title ?? 'Untitled workspace'), confidence: 1 })
      if (workspace.project_id) {
        const projectNode = `project:${String(workspace.project_id)}`
        addNode({ id: projectNode, domain: 'project', label: `Project ${String(workspace.project_id).slice(0, 8)}`, confidence: 0.9 })
        edges.push({ id: `${workspaceNode}->${projectNode}`, from: workspaceNode, to: projectNode, relation: 'belongs_to_project', confidence: 0.9 })
      }
      if (workspace.agent_id) {
        const agentNode = `agent:${String(workspace.agent_id)}`
        addNode({ id: agentNode, domain: 'agent', label: `Agent ${String(workspace.agent_id).slice(0, 8)}`, confidence: 0.9 })
        edges.push({ id: `${workspaceNode}->${agentNode}`, from: workspaceNode, to: agentNode, relation: 'coordinated_by', confidence: 0.9 })
      }
    }

    for (const card of cards) {
      const cardId = String(card.id)
      const cardNode = `context:${cardId}`
      const provenanceIds = card.knowledge_document_id ? [`knowledge:${String(card.knowledge_document_id)}`] : []
      addNode({ id: cardNode, domain: String(card.card_kind ?? 'context'), label: String(card.title ?? 'Untitled context'), confidence: card.pinned ? 0.95 : 0.8, provenanceIds })
      if (card.workspace_id) {
        const workspaceNode = `workspace:${String(card.workspace_id)}`
        if (seenNodes.has(workspaceNode)) edges.push({ id: `${cardNode}->${workspaceNode}`, from: cardNode, to: workspaceNode, relation: 'context_for', confidence: 0.9, provenanceIds })
      }
      for (const tag of Array.isArray(card.tags) ? card.tags.slice(0, 20) : []) {
        const normalized = String(tag).trim().toLowerCase()
        if (!normalized) continue
        const tagNode = `tag:${normalized}`
        addNode({ id: tagNode, domain: 'tag', label: normalized, confidence: 0.8 })
        edges.push({ id: `${cardNode}->${tagNode}`, from: cardNode, to: tagNode, relation: 'tagged_with', confidence: 0.8, provenanceIds })
      }
    }

    const graph = buildIntelligenceGraph(nodes, edges, {
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
    const requests: BlackstarWorkspaceActionRequest[] = data.requests.map((request) => ({
      actorId: request.actorId,
      action: request.action,
      ...(request.resourceId !== undefined ? { resourceId: request.resourceId } : {}),
      ...(request.purpose !== undefined ? { purpose: request.purpose } : {}),
    }))
    return buildBlackstarSharedWorkspacePlan(requests, {
      ownerId: context.userId,
      members: [{ id: context.userId, kind: 'human', role: 'owner' }, ...members],
      allowAgentEdits: data.allowAgentEdits,
      allowAgentExecution: data.allowAgentExecution,
      allowExternalSharing: data.allowExternalSharing,
      requireHumanApprovalForAgentMutations: data.requireHumanApprovalForAgentMutations,
      maximumActions: 100,
    })
  })