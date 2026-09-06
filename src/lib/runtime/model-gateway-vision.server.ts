import type { ChatResult, Provider } from './model-gateway.base'
import type { AstraVisionBenchmarkMedia } from '@/lib/evals/astra-vision-benchmark-media.server'

type VisionArgs = {
  provider: Provider
  model: string
  prompt: string
  media: AstraVisionBenchmarkMedia
  maxTokens?: number
}

function endpoint(provider: Provider) {
  if (provider === 'compatible') {
    const base = process.env['OPENAI_COMPATIBLE_BASE_URL']?.trim()
    if (!base) throw new Error('A dedicated OpenAI-compatible multimodal Astra endpoint is required for vision certification.')
    const key = process.env['OPENAI_COMPATIBLE_API_KEY']?.trim()
    return { url: `${base.replace(/\/+$/, '')}/chat/completions`, headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) } }
  }
  if (provider === 'openai') {
    const key = process.env['OPENAI_API_KEY']?.trim()
    if (!key) throw new Error('OpenAI is not configured for multimodal reference evaluation.')
    return { url: 'https://api.openai.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` } }
  }
  if (provider === 'groq') {
    const key = process.env['GROQ_API_KEY']?.trim()
    if (!key) throw new Error('Groq is not configured for multimodal reference evaluation.')
    return { url: 'https://api.groq.com/openai/v1/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` } }
  }
  if (provider === 'lovable') {
    const key = process.env['LOVABLE_API_KEY']?.trim()
    if (!key) throw new Error('Lovable AI Gateway is not configured for multimodal reference evaluation.')
    return { url: 'https://ai.gateway.lovable.dev/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key } }
  }
  if (provider === 'gemini') {
    const key = process.env['GEMINI_API_KEY']?.trim()
    if (!key) throw new Error('Google Gemini is not configured for multimodal reference evaluation.')
    return { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` } }
  }
  throw new Error(`${provider} is not supported by the pinned multimodal certification adapter.`)
}

export async function runVisionChatPinned(args: VisionArgs): Promise<ChatResult> {
  const target = endpoint(args.provider)
  const response = await fetch(target.url, {
    method: 'POST',
    headers: target.headers,
    body: JSON.stringify({
      model: args.model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: args.prompt },
          { type: 'image_url', image_url: { url: `data:${args.media.mediaType};base64,${args.media.base64}` } },
        ],
      }],
      max_tokens: args.maxTokens ?? 1600,
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300)
    throw new Error(`Pinned multimodal provider error (${response.status}): ${body}`)
  }
  const json = await response.json() as any
  const message = json.choices?.[0]?.message
  const text = typeof message?.content === 'string'
    ? message.content.trim()
    : Array.isArray(message?.content)
      ? message.content.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('').trim()
      : ''
  if (!text) throw new Error('Pinned multimodal provider returned an empty response.')
  return {
    text,
    toolCalls: [],
    usage: { input: Number(json.usage?.prompt_tokens ?? 0), output: Number(json.usage?.completion_tokens ?? 0) },
    provider: args.provider,
    model: args.model,
  }
}
