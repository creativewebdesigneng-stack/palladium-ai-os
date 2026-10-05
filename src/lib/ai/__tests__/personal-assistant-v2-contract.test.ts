import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const assistant = readFileSync(new URL('../assistant.functions.ts', import.meta.url), 'utf8')
const context = readFileSync(new URL('../assistant-context.server.ts', import.meta.url), 'utf8')
const conversations = readFileSync(new URL('../assistant-conversations.functions.ts', import.meta.url), 'utf8')
const preferences = readFileSync(new URL('../personal-assistant.functions.ts', import.meta.url), 'utf8')
const ui = readFileSync(new URL('../../../components/palladium/GlobalAIAssistant.jsx', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../../../components/settings/PersonalAssistantSection.jsx', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../../../../supabase/migrations/20261001223259_personal_assistant_v2.sql', import.meta.url), 'utf8')

describe('Blackstar personal assistant v2 contract', () => {
  it('persists owner-scoped conversation threads separately from memory', () => {
    expect(migration).toContain('create table if not exists public.assistant_conversations')
    expect(migration).toContain('create table if not exists public.assistant_messages')
    expect(migration).toContain('assistant_messages_conversation_owner_fk')
    expect(migration).toContain('foreign key (conversation_id, user_id)')
    expect(migration).toContain('Conversation history is separate from long-term memory capture')
    expect(conversations).toContain("eq('user_id', context.userId)")
  })

  it('loads durable history on the server instead of trusting browser history alone', () => {
    expect(assistant).toContain('resolveAssistantConversation')
    expect(assistant).toContain('conversationId: data.conversationId')
    expect(assistant).toContain('...conversation.history.map')
    expect(context).toContain("from('assistant_messages')")
    expect(context).toContain("eq('user_id', args.userId)")
  })

  it('uses the existing governed memory fabric without granting capture permission', () => {
    expect(context).toContain("from '@/lib/memory/memory.server'")
    expect(context).toContain("from '@/lib/memory/preferences.server'")
    expect(context).toContain('loadMemoryPreferences')
    expect(context).toContain('searchMemory')
    expect(context).toContain('do not treat this retrieval as permission to create new long-term memory')
  })

  it('exposes independent user controls for history, memory, workspace and live web', () => {
    for (const field of [
      'conversationHistoryEnabled',
      'memoryContextEnabled',
      'workspaceContextEnabled',
      'liveWebEnabled',
      'responseStyle',
    ]) {
      expect(preferences).toContain(field)
      expect(settings).toContain(field)
    }
  })

  it('supports thread switching in the global assistant while preserving assistantChat execution', () => {
    expect(ui).toContain('listAssistantConversations')
    expect(ui).toContain('getAssistantConversation')
    expect(ui).toContain('startNewConversation')
    expect(ui).toContain('openConversation')
    expect(ui).toContain('conversationId')
    expect(ui).toContain('assistantChat')
  })

  it('adds current-page connector capability context without granting execution authority', () => {
    expect(context).toContain('loadAssistantPageConnectorContext')
    expect(context).toContain('pageConnectorRecommendations')
    expect(context).toContain('listIntegrationCapabilities')
    expect(context).toContain('CURRENT PAGE CONNECTOR CONTEXT — READ-ONLY CAPABILITY DISCOVERY')
    expect(context).toContain('does not authorise or execute provider actions')
    expect(assistant).toContain('parseAssistantPathname')
    expect(assistant).toContain('pageConnectorContext.prompt')
    expect(assistant).toContain('pageConnectorCapabilities')
    expect(ui).toContain('window.location.pathname')
    expect(ui).toContain('pageConnectorCapabilities')
  })

  it('keeps agent and integration discovery read-only and workspace context bounded', () => {
    expect(context).toContain('discoverAssistantAgents')
    expect(context).toContain('loadAssistantConnectionContext')
    expect(context).toContain('assistantConnectionContext')
    expect(context).toContain('Never claim an action completed from this read-only context')
    expect(context).toContain('agentMatches')
    expect(context).toContain('connected')
    expect(context).not.toContain('access_token_ciphertext')
  })
})
