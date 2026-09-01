import { describe, expect, it } from 'vitest'
import { toAiHubMultimodalResources } from '../multimodal'

describe('AI Hub multimodal capability projection', () => {
  it('projects voice, image and video runtimes without worker endpoints or credentials', () => {
    const resources = toAiHubMultimodalResources({
      voice: {
        openai: {
          configured: true,
          tts: true,
          stt: true,
          customVoices: true,
          ttsDefaultModel: 'gpt-4o-mini-tts',
          sttDefaultModel: 'gpt-4o-mini-transcribe',
          voices: ['alloy', 'coral'],
          formats: ['mp3', 'wav'],
        },
      },
      luxTts: {
        configured: true,
        provider: 'luxtts',
        tts: true,
        voiceCloning: true,
        outputSampleRateHz: 48000,
        localFirst: true,
      },
      generativeMedia: {
        seedream: {
          configured: true,
          kind: 'image',
          workflows: ['text-to-image', 'image-edit'],
          aspectRatios: ['1:1', '16:9'],
        },
        ltx: {
          configured: false,
          kind: 'video',
          workflows: ['text-to-video', 'image-to-video'],
          aspectRatios: ['16:9', '9:16'],
          durationSeconds: [3, 5],
        },
      },
      mediaRuntime: {
        autoEditor: {
          configured: true,
          modes: ['silence', 'motion'],
          exports: ['mp4', 'resolve'],
        },
      },
    })

    expect(resources.map((resource) => resource.kind)).toEqual(['voice', 'voice', 'image', 'video', 'video'])
    expect(resources.find((resource) => resource.id === 'openai-audio')).toMatchObject({
      status: 'available',
      providerId: 'palladium-voice:openai',
      capabilities: ['text-to-speech', 'speech-to-text', 'custom-voices'],
    })
    expect(resources.find((resource) => resource.id === 'ltx')?.status).toBe('unconfigured')
    expect(resources.find((resource) => resource.id === 'auto-editor')?.capabilities).toContain('video-editing')

    const serialized = JSON.stringify(resources)
    expect(serialized).not.toContain('WORKER_URL')
    expect(serialized).not.toContain('WORKER_TOKEN')
    expect(serialized).not.toContain('api-key-secret')
    expect(serialized).not.toContain('https://private-worker.example')
  })
})
