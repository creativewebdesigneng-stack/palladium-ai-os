import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'

type Sb = { from: (table: string) => any }

const idSchema = z.string().uuid()

function titleFromMessage(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return (compact || 'New conversation').slice(0, 96)
}

export const listAssistantConversations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    includeArchived: z.boolean().optional().default(false),
    limit: z.number().int().min(1).max(100).optional().default(30),
  }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    let query = sb.from('assistant_conversations')
      .select('id,title,archived_at,last_message_at,created_at,updated_at')
      .eq('user_id', context.userId)
      .order('last_message_at', { ascending: false })
      .limit(data.limit)
    if (!data.includeArchived) query = query.is('archived_at', null)
    const { data: rows, error } = await query
    if (error) throw new Error(error.message)
    return { conversations: rows ?? [] }
  })

export const createAssistantConversation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    title: z.string().trim().min(1).max(160).optional(),
    seedMessage: z.string().trim().min(1).max(4000).optional(),
  }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const title = data.title?.trim() || (data.seedMessage ? titleFromMessage(data.seedMessage) : 'New conversation')
    const { data: row, error } = await sb.from('assistant_conversations')
      .insert({ user_id: context.userId, title })
      .select('id,title,archived_at,last_message_at,created_at,updated_at')
      .single()
    if (error) throw new Error(error.message)
    await writeAudit({
      userId: context.userId,
      action: 'assistant.conversation.created',
      targetType: 'assistant_conversation',
      targetId: row.id,
      status: 'success',
      metadata: { title: row.title },
    })
    return { conversation: row }
  })

export const getAssistantConversation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    conversationId: idSchema,
    limit: z.number().int().min(1).max(200).optional().default(80),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const [conversationResult, messagesResult] = await Promise.all([
      sb.from('assistant_conversations')
        .select('id,title,archived_at,last_message_at,created_at,updated_at')
        .eq('id', data.conversationId)
        .eq('user_id', context.userId)
        .maybeSingle(),
      sb.from('assistant_messages')
        .select('id,conversation_id,role,content,provider,model,metadata,created_at')
        .eq('conversation_id', data.conversationId)
        .eq('user_id', context.userId)
        .order('created_at', { ascending: true })
        .limit(data.limit),
    ])
    if (conversationResult.error) throw new Error(conversationResult.error.message)
    if (!conversationResult.data) throw new Error('Conversation not found.')
    if (messagesResult.error) throw new Error(messagesResult.error.message)
    return { conversation: conversationResult.data, messages: messagesResult.data ?? [] }
  })

export const renameAssistantConversation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    conversationId: idSchema,
    title: z.string().trim().min(1).max(160),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { data: row, error } = await sb.from('assistant_conversations')
      .update({ title: data.title, updated_at: new Date().toISOString() })
      .eq('id', data.conversationId)
      .eq('user_id', context.userId)
      .select('id,title,archived_at,last_message_at,updated_at')
      .maybeSingle()
    if (error || !row) throw new Error(error?.message ?? 'Conversation not found.')
    return { conversation: row }
  })

export const archiveAssistantConversation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    conversationId: idSchema,
    archived: z.boolean().optional().default(true),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const now = new Date().toISOString()
    const { data: row, error } = await sb.from('assistant_conversations')
      .update({ archived_at: data.archived ? now : null, updated_at: now })
      .eq('id', data.conversationId)
      .eq('user_id', context.userId)
      .select('id,title,archived_at,last_message_at,updated_at')
      .maybeSingle()
    if (error || !row) throw new Error(error?.message ?? 'Conversation not found.')
    return { conversation: row }
  })

export const deleteAssistantConversation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: idSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { error } = await sb.from('assistant_conversations')
      .delete()
      .eq('id', data.conversationId)
      .eq('user_id', context.userId)
    if (error) throw new Error(error.message)
    await writeAudit({
      userId: context.userId,
      action: 'assistant.conversation.deleted',
      targetType: 'assistant_conversation',
      targetId: data.conversationId,
      status: 'success',
    })
    return { deleted: true, conversationId: data.conversationId }
  })
