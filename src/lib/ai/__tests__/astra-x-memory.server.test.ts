import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadPreferences: vi.fn(),
  recallMemory: vi.fn(),
}))

vi.mock('@/lib/memory/preferences.server', () => ({
  loadMemoryPreferences: mocks.loadPreferences,
}))
vi.mock('@/lib/memory/memory-fabric.server', () => ({
  recallMemoryFabric: mocks.recallMemory,
}))

import { loadAstraXMemoryPrompt } from '../astra-x-memory.server'

const preferences = {
  auto_capture: true,
  capture_sensitive: false,
  short_term_enabled: true,
  long_term_enabled: true,
  document_memory_enabled: true,
  organisation_sharing_enabled: false,
  short_term_ttl_minutes: 720,
  retention_days: null,
}

const privateMemory = {
  id: 'memory-1',
  kind: 'memory' as const,
  content: 'The project uses a local-first model gateway.',
  title: 'Project architecture',
  source: 'owner note',
  recorded_at: '2026-11-20T12:00:00.000Z',
  memory_type: 'long_term',
  scope: 'private',
  agent_id: null,
  org_id: null,
  expires_at: null,
  similarity: 0.9,
  layer: 'long_term' as const,
  provenance: { id: 'memory-1', kind: 'memory' as const },
}

describe('Astra X governed memory context', () => {
  beforeEach(() => {
    mocks.loadPreferences.mockReset()
    mocks.recallMemory.mockReset()
    mocks.loadPreferences.mockResolvedValue(preferences)
    mocks.recallMemory.mockResolvedValue([privateMemory])
  })

  it('uses only user-scoped memory and labels it as untrusted reference data', async () => {
    const prompt = await loadAstraXMemoryPrompt({
      sb: { from: vi.fn(), rpc: vi.fn() },
      userId: 'user-1',
      query: 'How is the project model configured?',
    })

    expect(prompt).toContain('BLACKSTAR AGENT MEMORY — UNTRUSTED REFERENCE DATA')
    expect(prompt).toContain('memory:memory-1')
    expect(prompt).toContain('local-first model gateway')
    expect(mocks.recallMemory).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      context: { agentId: null, orgId: null },
      limit: 8,
      includeDocuments: true,
    }))
  })

  it('respects the user preference that disables long-term memory', async () => {
    mocks.loadPreferences.mockResolvedValue({
      ...preferences,
      long_term_enabled: false,
    })
    const prompt = await loadAstraXMemoryPrompt({
      sb: { from: vi.fn(), rpc: vi.fn() },
      userId: 'user-1',
      query: 'project model',
    })
    expect(prompt).toBe('')
  })

  it('fails closed when memory preferences cannot be loaded', async () => {
    mocks.loadPreferences.mockRejectedValue(new Error('database unavailable'))
    const prompt = await loadAstraXMemoryPrompt({
      sb: { from: vi.fn(), rpc: vi.fn() },
      userId: 'user-1',
      query: 'project model',
    })
    expect(prompt).toBe('')
    expect(mocks.recallMemory).not.toHaveBeenCalled()
  })

  it('fails closed when memory retrieval fails and does not broaden scope', async () => {
    mocks.recallMemory.mockRejectedValue(new Error('recall unavailable'))
    const prompt = await loadAstraXMemoryPrompt({
      sb: { from: vi.fn(), rpc: vi.fn() },
      userId: 'user-1',
      query: 'project model',
    })
    expect(prompt).toBe('')
    expect(mocks.recallMemory).toHaveBeenCalledOnce()
  })

  it('does not search when the query is empty', async () => {
    const prompt = await loadAstraXMemoryPrompt({
      sb: { from: vi.fn(), rpc: vi.fn() },
      userId: 'user-1',
      query: '   ',
    })
    expect(prompt).toBe('')
    expect(mocks.loadPreferences).not.toHaveBeenCalled()
    expect(mocks.recallMemory).not.toHaveBeenCalled()
  })
})
