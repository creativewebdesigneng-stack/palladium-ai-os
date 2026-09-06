import { describe, expect, it } from 'vitest'
import { buildBlackstarAstraVisionRequest } from '../blackstar-astra-vision-tool.server'
import { buildBlackstarAstraRunCapabilityControl } from '../blackstar-astra-capability-control'

describe('Blackstar Astra vision transport', () => {
  it('builds an OpenAI-compatible multimodal request from private bytes, not an arbitrary URL', () => {
    const body = buildBlackstarAstraVisionRequest({
      model: 'qwen-vl-blackstar',
      mimeType: 'image/png',
      dataBase64: 'aGVsbG8=',
      question: 'Inspect this interface',
    })
    expect(body.model).toBe('qwen-vl-blackstar')
    expect(body.messages[0]?.content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,aGVsbG8=' },
    })
    expect(JSON.stringify(body)).not.toContain('http://')
    expect(JSON.stringify(body)).not.toContain('https://')
  })

  it('rejects unsafe/non-image MIME types before transport', () => {
    expect(() => buildBlackstarAstraVisionRequest({
      model: 'vision',
      mimeType: 'text/html',
      dataBase64: 'PGh0bWw+',
      question: 'inspect',
    })).toThrow('Unsupported vision artifact type')
  })

  it('advertises vision and private-artifact multimodal input only when astra_vision is already granted', () => {
    const withoutVision = buildBlackstarAstraRunCapabilityControl(['browser_task'])
    expect(withoutVision.available).not.toContain('vision')
    expect(withoutVision.available).not.toContain('multimodal_input')
    expect(withoutVision.unavailable_target_capabilities).toContain('vision')
    expect(withoutVision.unavailable_target_capabilities).toContain('multimodal_input')

    const withVision = buildBlackstarAstraRunCapabilityControl(['browser_task', 'astra_vision'])
    expect(withVision.available).toContain('vision')
    expect(withVision.available).toContain('multimodal_input')
    expect(withVision.unavailable_target_capabilities).not.toContain('vision')
    expect(withVision.unavailable_target_capabilities).not.toContain('multimodal_input')
  })
})
