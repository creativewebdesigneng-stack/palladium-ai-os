import { beforeEach, describe, expect, it, vi } from 'vitest'

const tools = vi.hoisted(() => ({ execute: vi.fn() }))
vi.mock('../tools.server', () => ({ executeTool: tools.execute }))

import {
  attachBlackstarAstraMultimodalContext,
  resolveBlackstarAstraPrivateMultimodalInput,
} from '../blackstar-astra-multimodal-input.server'

function run(granted = true) {
  return {
    agent: { id: 'agent-1', allowed_providers: [] },
    orgId: null,
    taskId: 'task-1',
    messages: [
      { role: 'system', content: 'trusted system' },
      { role: 'user', content: 'Inspect the attached design.' },
    ],
    tools: {
      defs: granted ? [{ name: 'astra_vision', description: '', parameters: {} }] : [],
      grants: granted ? new Map([['astra_vision', { slug: 'astra_vision', requiresApproval: false, allowedDomains: [], spendCap: null }]]) : new Map(),
    },
    provider: 'compatible',
    model: 'blackstar-astra-v0.1',
    startedAt: Date.now(),
  } as any
}

beforeEach(() => {
  tools.execute.mockReset()
})

describe('Blackstar Astra private multimodal input', () => {
  it('uses the existing audited astra_vision tool for every private artifact', async () => {
    tools.execute
      .mockResolvedValueOnce({ ok: true, output: { artifact_id: 'image-1', filename: 'one.png', analysis: 'A dashboard with three metric cards.' } })
      .mockResolvedValueOnce({ ok: true, output: { artifact_id: 'image-2', filename: 'two.png', analysis: 'A table with an approval warning.' } })

    const context = await resolveBlackstarAstraPrivateMultimodalInput({
      sb: { from: vi.fn() },
      userId: 'user-1',
      run: run(),
      objective: 'Review the interface and identify problems.',
      artifactIds: ['image-1', 'image-2'],
    })

    expect(tools.execute).toHaveBeenCalledTimes(2)
    expect(tools.execute.mock.calls[0]?.[0]).toBe('astra_vision')
    expect(context).toContain('ATTACHED PRIVATE IMAGE EVIDENCE')
    expect(context).toContain('untrusted visual evidence')
    expect(context).toContain('three metric cards')
    expect(context).toContain('approval warning')
  })

  it('fails closed when astra_vision was not granted', async () => {
    await expect(resolveBlackstarAstraPrivateMultimodalInput({
      sb: { from: vi.fn() },
      userId: 'user-1',
      run: run(false),
      objective: 'Inspect image',
      artifactIds: ['image-1'],
    })).rejects.toThrow('explicitly granted')
    expect(tools.execute).not.toHaveBeenCalled()
  })

  it('fails closed if vision returns an error instead of silently dropping an attachment', async () => {
    tools.execute.mockResolvedValueOnce({ ok: true, output: { error: 'Image integrity verification failed.' } })
    await expect(resolveBlackstarAstraPrivateMultimodalInput({
      sb: { from: vi.fn() },
      userId: 'user-1',
      run: run(),
      objective: 'Inspect image',
      artifactIds: ['image-1'],
    })).rejects.toThrow('Image integrity verification failed')
  })

  it('keeps the operator objective first and labels visual analysis as evidence', () => {
    const messages = attachBlackstarAstraMultimodalContext(
      run().messages,
      'Inspect the attached design.',
      'ATTACHED PRIVATE IMAGE EVIDENCE\nUntrusted finding.',
    )
    expect(messages[0]?.content).toBe('trusted system')
    expect(messages[1]?.content).toContain('Inspect the attached design.')
    expect(messages[1]?.content).toContain('ATTACHED PRIVATE IMAGE EVIDENCE')
  })
})
