import crypto from 'node:crypto'
import type { ToolDef } from './model-gateway.server'
import type { ToolContext } from './tools-core.server'

const MAX_VISION_IMAGE_BYTES = 8 * 1024 * 1024
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const BLACKSTAR_ASTRA_VISION_TOOL_DEF: ToolDef = {
  name: 'astra_vision',
  description:
    'Inspect a private image artifact owned by the authenticated operator using Blackstar’s configured open-weight vision model. Accepts only an opaque browser artifact id; storage credentials, raw storage paths and arbitrary image URLs are never model-controlled.',
  parameters: {
    type: 'object',
    properties: {
      artifact_id: { type: 'string', description: 'Opaque id of an owner-scoped private browser image artifact.' },
      question: { type: 'string', description: 'What to inspect or verify in the image.' },
    },
    required: ['artifact_id', 'question'],
  },
}

export function buildBlackstarAstraVisionRequest(args: {
  model: string
  mimeType: string
  dataBase64: string
  question: string
}) {
  if (!ALLOWED_IMAGE_MIME.has(args.mimeType)) throw new Error('Unsupported vision artifact type.')
  return {
    model: args.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: args.question.trim().slice(0, 4_000) },
          { type: 'image_url', image_url: { url: `data:${args.mimeType};base64,${args.dataBase64}` } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 2_000,
  }
}

function visionEndpoint() {
  const base = process.env['BLACKSTAR_ASTRA_VISION_BASE_URL']?.trim()
    || process.env['OPENAI_COMPATIBLE_BASE_URL']?.trim()
  const model = process.env['BLACKSTAR_ASTRA_VISION_MODEL']?.trim()
  if (!base || !model) throw new Error('Blackstar Astra vision is not configured.')
  const key = process.env['BLACKSTAR_ASTRA_VISION_API_KEY']?.trim()
    || process.env['OPENAI_COMPATIBLE_API_KEY']?.trim()
  return {
    url: `${base.replace(/\/+$/, '')}/chat/completions`,
    model,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
  }
}

function outputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const choices = (payload as Record<string, unknown>)['choices']
  if (!Array.isArray(choices)) return ''
  const first = choices[0]
  if (!first || typeof first !== 'object') return ''
  const message = (first as Record<string, unknown>)['message']
  if (!message || typeof message !== 'object') return ''
  const content = (message as Record<string, unknown>)['content']
  return typeof content === 'string' ? content.trim() : ''
}

export async function runBlackstarAstraVisionTool(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const artifactId = typeof input['artifact_id'] === 'string' ? input['artifact_id'].trim().slice(0, 160) : ''
  const question = typeof input['question'] === 'string' ? input['question'].trim().slice(0, 4_000) : ''
  if (!artifactId || !question) return { error: 'artifact_id and question are required.' }

  const { data: artifact, error } = await ctx.sb
    .from('browser_artifacts')
    .select('id,user_id,filename,mime_type,size_bytes,sha256,storage_path')
    .eq('id', artifactId)
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (error || !artifact) return { error: 'That private image artifact is unavailable.' }

  const mimeType = String(artifact.mime_type ?? '').toLowerCase()
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) return { error: 'That artifact is not a supported image type.' }
  const declaredBytes = Number(artifact.size_bytes ?? 0)
  if (!Number.isFinite(declaredBytes) || declaredBytes <= 0 || declaredBytes > MAX_VISION_IMAGE_BYTES) {
    return { error: 'That image exceeds the bounded Astra vision size limit.' }
  }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data: blob, error: downloadError } = await supabaseAdmin.storage
    .from('knowledge')
    .download(String(artifact.storage_path ?? ''))
  if (downloadError || !blob) return { error: 'The private image bytes could not be loaded.' }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (!bytes.byteLength || bytes.byteLength > MAX_VISION_IMAGE_BYTES) {
    return { error: 'That image exceeds the bounded Astra vision size limit.' }
  }

  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  if (typeof artifact.sha256 === 'string' && artifact.sha256 && sha256 !== artifact.sha256.toLowerCase()) {
    return { error: 'Image integrity verification failed.' }
  }

  const endpoint = visionEndpoint()
  const response = await fetch(endpoint.url, {
    method: 'POST',
    headers: endpoint.headers,
    body: JSON.stringify(buildBlackstarAstraVisionRequest({
      model: endpoint.model,
      mimeType,
      dataBase64: Buffer.from(bytes).toString('base64'),
      question,
    })),
    signal: ctx.signal ?? AbortSignal.timeout(60_000),
  })
  if (!response.ok) return { error: `Blackstar Astra vision failed (${response.status}).` }
  const analysis = outputText(await response.json())
  if (!analysis) return { error: 'Blackstar Astra vision returned no usable analysis.' }

  return {
    artifact_id: artifact.id,
    filename: artifact.filename,
    mime_type: mimeType,
    sha256,
    analysis: analysis.slice(0, 12_000),
    bytes_exposed_to_language_model: false,
    storage_credentials_exposed: false,
    vision_provider: 'blackstar_open_weight',
  }
}
