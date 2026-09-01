import type { AiHubLiveResource } from './resources'

type VoiceCapabilities = {
  openai: {
    configured: boolean
    tts: boolean
    stt: boolean
    customVoices: boolean
    ttsDefaultModel: string
    sttDefaultModel: string
    voices: readonly string[]
    formats: readonly string[]
  }
}

type LuxTtsCapabilities = {
  configured: boolean
  provider: string
  tts: boolean
  voiceCloning: boolean
  outputSampleRateHz: number
  localFirst: boolean
}

type GenerativeMediaCapabilities = {
  seedream: {
    configured: boolean
    kind?: string
    workflows: readonly string[]
    aspectRatios: readonly string[]
  }
  ltx: {
    configured: boolean
    kind?: string
    workflows: readonly string[]
    aspectRatios: readonly string[]
    durationSeconds: readonly number[]
  }
}

type MediaRuntimeCapabilities = {
  autoEditor: {
    configured: boolean
    modes: readonly string[]
    exports: readonly string[]
  }
}

function availability(configured: boolean) {
  return configured ? 'available' : 'unconfigured'
}

export function toAiHubMultimodalResources(input: {
  voice: VoiceCapabilities
  luxTts: LuxTtsCapabilities
  generativeMedia: GenerativeMediaCapabilities
  mediaRuntime: MediaRuntimeCapabilities
}): AiHubLiveResource[] {
  const { openai } = input.voice
  const { seedream, ltx } = input.generativeMedia
  const { autoEditor } = input.mediaRuntime

  return [
    {
      id: 'openai-audio',
      kind: 'voice',
      name: 'OpenAI Voice Runtime',
      status: availability(openai.configured),
      providerId: 'palladium-voice:openai',
      capabilities: [
        ...(openai.tts ? ['text-to-speech'] : []),
        ...(openai.stt ? ['speech-to-text'] : []),
        ...(openai.customVoices ? ['custom-voices'] : []),
      ],
      metadata: {
        source: 'voice-runtime',
        ttsModel: openai.ttsDefaultModel,
        sttModel: openai.sttDefaultModel,
        voiceCount: String(openai.voices.length),
        formats: openai.formats.join(', '),
      },
    },
    {
      id: 'luxtts',
      kind: 'voice',
      name: 'LuxTTS',
      status: availability(input.luxTts.configured),
      providerId: 'palladium-voice:luxtts',
      capabilities: [
        ...(input.luxTts.tts ? ['text-to-speech'] : []),
        ...(input.luxTts.voiceCloning ? ['voice-cloning'] : []),
        ...(input.luxTts.localFirst ? ['local-execution'] : []),
      ],
      metadata: {
        source: 'lux-tts',
        outputSampleRateHz: String(input.luxTts.outputSampleRateHz),
        localFirst: String(input.luxTts.localFirst),
      },
    },
    {
      id: 'seedream',
      kind: 'image',
      name: 'Seedream Image Runtime',
      status: availability(seedream.configured),
      providerId: 'palladium-media:seedream',
      capabilities: [...seedream.workflows],
      metadata: {
        source: 'generative-media',
        workflows: seedream.workflows.join(', '),
        aspectRatios: seedream.aspectRatios.join(', '),
      },
    },
    {
      id: 'ltx',
      kind: 'video',
      name: 'LTX Video Runtime',
      status: availability(ltx.configured),
      providerId: 'palladium-media:ltx',
      capabilities: [...ltx.workflows],
      metadata: {
        source: 'generative-media',
        workflows: ltx.workflows.join(', '),
        aspectRatios: ltx.aspectRatios.join(', '),
        durationSeconds: ltx.durationSeconds.join(', '),
      },
    },
    {
      id: 'auto-editor',
      kind: 'video',
      name: 'Auto-Editor Media Runtime',
      status: availability(autoEditor.configured),
      providerId: 'palladium-media:auto-editor',
      capabilities: ['video-editing', ...autoEditor.modes.map((mode) => `${mode}-editing`)],
      metadata: {
        source: 'media-runtime',
        modes: autoEditor.modes.join(', '),
        exports: autoEditor.exports.join(', '),
      },
    },
  ]
}
