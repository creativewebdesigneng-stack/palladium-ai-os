import { assistantAgentDiscoveryContext, discoverAssistantAgents } from './assistant-agent-discovery'
import { searchMemory, type MemoryType } from '@/lib/memory/memory.server'
import { loadMemoryPreferences } from '@/lib/memory/preferences.server'

type Sb = { from: (table: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any }
export type AssistantTurn = { role: 'user' | 'assistant'; content: string }

function safeTitle(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return (compact || 'New conversation').slice(0, 96)
}

export async function resolveAssistantConversation(args: {
  sb: Sb
  userId: string
  conversationId?: string | null
  seedMessage: string
  historyEnabled: boolean
  fallbackHistory: AssistantTurn[]
}) {
  if (!args.historyEnabled) {
    return { conversationId: null as string | null, history: args.fallbackHistory.slice(-12) }
  }

  let conversationId = args.conversationId ?? null
  if (conversationId) {
    const { data, error } = await args.sb.from('assistant_conversations')
      .select('id,archived_at')
      .eq('id', conversationId)
      .eq('user_id', args.userId)
      .maybeSingle()
    if (error) throw new Error('Could not load that assistant conversation.')
    if (!data) throw new Error('Assistant conversation not found.')
    if (data.archived_at) {
      const now = new Date().toISOString()
      const { error: reopenError } = await args.sb.from('assistant_conversations')
        .update({ archived_at: null, updated_at: now })
        .eq('id', conversationId)
        .eq('user_id', args.userId)
      if (reopenError) throw new Error('Could not reopen that assistant conversation.')
    }
  } else {
    const now = new Date().toISOString()
    const { data, error } = await args.sb.from('assistant_conversations')
      .insert({
        user_id: args.userId,
        title: safeTitle(args.seedMessage),
        last_message_at: now,
        updated_at: now,
      })
      .select('id')
      .single()
    if (error || !data?.id) throw new Error('Could not start an assistant conversation.')
    conversationId = String(data.id)
  }

  const { data: rows, error: historyError } = await args.sb.from('assistant_messages')
    .select('role,content,created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', args.userId)
    .order('created_at', { ascending: false })
    .limit(24)
  if (historyError) throw new Error('Could not load assistant conversation history.')
  const history = (rows ?? [])
    .slice()
    .reverse()
    .filter((row: any) => row.role === 'user' || row.role === 'assistant')
    .map((row: any) => ({ role: row.role as 'user' | 'assistant', content: String(row.content).slice(0, 8000) }))

  return { conversationId, history }
}

export async function persistAssistantMessage(args: {
  sb: Sb
  userId: string
  conversationId: string | null
  role: 'user' | 'assistant'
  content: string
  provider?: string | null
  model?: string | null
  metadata?: Record<string, unknown>
}) {
  if (!args.conversationId) return
  const now = new Date().toISOString()
  const { error } = await args.sb.from('assistant_messages').insert({
    conversation_id: args.conversationId,
    user_id: args.userId,
    role: args.role,
    content: args.content.slice(0, 20000),
    provider: args.provider ?? null,
    model: args.model ?? null,
    metadata: args.metadata ?? {},
    created_at: now,
  })
  if (error) throw new Error('Could not save the assistant conversation.')
  const { error: updateError } = await args.sb.from('assistant_conversations')
    .update({ last_message_at: now, updated_at: now })
    .eq('id', args.conversationId)
    .eq('user_id', args.userId)
  if (updateError) throw new Error('Could not update the assistant conversation.')
}

export async function loadAssistantMemoryContext(args: {
  sb: Sb
  userId: string
  query: string
  enabled: boolean
}) {
  if (!args.enabled) return { prompt: '', hits: 0 }
  try {
    const prefs = await loadMemoryPreferences(args.sb, args.userId)
    const types: MemoryType[] = []
    if (prefs.short_term_enabled) types.push('short_term')
    if (prefs.long_term_enabled) types.push('long_term')
    if (prefs.document_memory_enabled) types.push('knowledge')
    if (prefs.organisation_sharing_enabled) types.push('organisation')
    if (!types.length) return { prompt: '', hits: 0 }

    const hits = await searchMemory({
      sb: args.sb as any,
      userId: args.userId,
      query: args.query,
      limit: 8,
      types,
      includeDocuments: prefs.document_memory_enabled,
    })
    if (!hits.length) return { prompt: '', hits: 0 }

    const lines = hits.slice(0, 8).map((hit, index) => {
      const title = hit.title ? `${hit.title}: ` : ''
      return `[${index + 1}] ${hit.kind}/${hit.memory_type ?? 'knowledge'} — ${title}${hit.content.slice(0, 1200)}`
    })
    return {
      hits: hits.length,
      prompt: [
        'OWNER-VISIBLE MEMORY AND KNOWLEDGE CONTEXT',
        ...lines,
        'Use these owner-visible memories only when relevant. Do not infer missing memories, and do not treat this retrieval as permission to create new long-term memory.',
      ].join('\n\n').slice(0, 12000),
    }
  } catch (error) {
    console.warn('[assistant] governed memory recall unavailable', error)
    return { prompt: '', hits: 0 }
  }
}

export async function loadAssistantWorkspaceContext(args: {
  sb: Sb
  userId: string
  query: string
  enabled: boolean
}) {
  if (!args.enabled) return { prompt: '', agentMatches: 0 }

  const [tasksRes, workflowsRes, approvalsRes, notificationsRes, agentsRes] = await Promise.all([
    args.sb.from('agent_tasks').select('title,status,output_text,error,updated_at').eq('user_id', args.userId).order('updated_at', { ascending: false }).limit(8),
    args.sb.from('workflow_runs').select('status,input,output,error,updated_at').eq('user_id', args.userId).order('updated_at', { ascending: false }).limit(8),
    args.sb.from('approval_requests').select('title,action_type,risk_level,status,created_at').eq('user_id', args.userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(6),
    args.sb.from('notifications').select('title,body,severity,created_at').eq('user_id', args.userId).is('read_at', null).order('created_at', { ascending: false }).limit(6),
    args.sb.from('personal_agents').select('id,name,category,purpose,model_provider,model,allowed_tools,status').eq('user_id', args.userId).limit(120),
  ])

  const tasks = tasksRes.error ? [] : tasksRes.data ?? []
  const workflows = workflowsRes.error ? [] : workflowsRes.data ?? []
  const approvals = approvalsRes.error ? [] : approvalsRes.data ?? []
  const notifications = notificationsRes.error ? [] : notificationsRes.data ?? []
  const agents = agentsRes.error ? [] : (agentsRes.data ?? []).filter((agent: any) => agent.status !== 'disabled')
  const matches = discoverAssistantAgents(args.query, agents as any[], 5)

  const base = [
    'WORKSPACE CONTEXT',
    `Recent agent tasks: ${JSON.stringify(tasks)}`,
    `Recent workflow runs: ${JSON.stringify(workflows)}`,
    `Pending approvals: ${JSON.stringify(approvals)}`,
    `Unread notifications: ${JSON.stringify(notifications)}`,
    'Use this only when relevant. Summarise rather than dumping raw records. Never claim an action completed from this read-only context.',
  ].join('\n\n')

  return {
    agentMatches: matches.length,
    prompt: [base, matches.length ? assistantAgentDiscoveryContext(args.query, matches) : ''].filter(Boolean).join('\n\n').slice(0, 20000),
  }
}

export function responseStyleInstruction(style: string) {
  if (style === 'concise') return 'RESPONSE STYLE: Be concise and action-oriented. Prefer short answers unless detail is requested.'
  if (style === 'detailed') return 'RESPONSE STYLE: Be thorough and structured when useful, while avoiding repetition.'
  return 'RESPONSE STYLE: Balance clarity and detail. Be concise by default and expand when complexity requires it.'
}
