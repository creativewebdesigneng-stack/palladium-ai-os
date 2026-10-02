const HF_CINEMA_BUCKET = 'cinema-hf-outputs'

function token() {
  return (process.env['HF_TOKEN'] || process.env['HUGGINGFACE_TOKEN'] || '').trim()
}

function endpointUrl() {
  const raw = (process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL'] || '').trim()
  if (!raw) return ''
  const url = new URL(raw)
  if (url.protocol !== 'https:') throw new Error('Hugging Face Cinema endpoint must use HTTPS.')
  const host = url.hostname.toLowerCase()
  if (!host.endsWith('.endpoints.huggingface.cloud')) {
    throw new Error('Hugging Face Cinema endpoint must be a dedicated huggingface.cloud Inference Endpoint.')
  }
  return url.toString().replace(/\/+$/, '')
}

export function getHuggingFaceCinemaCapabilities() {
  const endpoint = endpointUrl()
  const key = token()
  return {
    configured: Boolean(endpoint && key),
    endpointConfigured: Boolean(endpoint),
    tokenConfigured: Boolean(key),
    workflow: 'text-to-video-preview',
    maxFrames: 96,
    bucket: HF_CINEMA_BUCKET,
    note: endpoint && key
      ? 'Uses a configured private Hugging Face dedicated Inference Endpoint for bounded text-to-video previews. Existing Blackstar Seedream/LTX/Cinema workers remain authoritative for the normal production pipeline.'
      : 'Configure HUGGINGFACE_CINEMA_ENDPOINT_URL and HF_TOKEN/HUGGINGFACE_TOKEN to enable bounded Hugging Face text-to-video previews.',
  }
}

function safeVideoContentType(value: string | null) {
  const contentType = (value || '').split(';')[0]?.trim().toLowerCase() || ''
  return ['video/mp4','video/webm','application/octet-stream'].includes(contentType)
    ? contentType
    : ''
}

function extensionFor(contentType: string) {
  return contentType === 'video/webm' ? 'webm' : 'mp4'
}

export async function generateHuggingFaceCinemaPreview(args: {
  userId: string
  jobId: string
  prompt: string
  modelId?: string | null
  numFrames?: number | null
  seed?: number | null
}) {
  const endpoint = endpointUrl()
  const key = token()
  if (!endpoint || !key) throw new Error('Hugging Face Cinema preview execution is not configured.')

  const numFrames = Math.max(8, Math.min(96, Math.round(args.numFrames ?? 48)))
  const body = {
    inputs: args.prompt,
    parameters: {
      num_frames: numFrames,
      num_inference_steps: 28,
      guidance_scale: 5.0,
      ...(Number.isInteger(args.seed) ? { seed: args.seed } : {}),
    },
    ...(args.modelId?.trim() ? { model: args.modelId.trim() } : {}),
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'video/mp4,video/webm,application/octet-stream',
    },
    body: JSON.stringify(body),
    redirect: 'manual',
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`Hugging Face Cinema endpoint rejected the preview (HTTP ${response.status})${detail ? `: ${detail}` : ''}`)
  }

  const contentType = safeVideoContentType(response.headers.get('content-type'))
  if (!contentType) {
    throw new Error('Hugging Face Cinema endpoint did not return a supported video payload.')
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength < 1024) throw new Error('Hugging Face Cinema endpoint returned an empty or invalid video payload.')
  if (bytes.byteLength > 250 * 1024 * 1024) throw new Error('Hugging Face Cinema preview exceeded the 250 MB storage limit.')

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const extension = extensionFor(contentType)
  const objectPath = `${args.userId}/${args.jobId}.${extension}`
  const upload = await supabaseAdmin.storage
    .from(HF_CINEMA_BUCKET)
    .upload(objectPath, bytes, {
      contentType: contentType === 'application/octet-stream' ? 'video/mp4' : contentType,
      cacheControl: '3600',
      upsert: false,
    })
  if (upload.error) throw new Error(`Could not store Hugging Face Cinema output: ${upload.error.message}`)

  const signed = await supabaseAdmin.storage.from(HF_CINEMA_BUCKET).createSignedUrl(upload.data.path, 60 * 60)
  if (signed.error || !signed.data?.signedUrl) throw new Error('Could not create a signed URL for the Hugging Face Cinema output.')

  return {
    objectPath: upload.data.path,
    signedUrl: signed.data.signedUrl,
    contentType: contentType === 'application/octet-stream' ? 'video/mp4' : contentType,
    bytes: bytes.byteLength,
    numFrames,
  }
}

export async function signHuggingFaceCinemaOutput(objectPath: string) {
  const path = objectPath.trim()
  if (!/^[0-9a-f-]{36}\/[A-Za-z0-9._-]+\.(mp4|webm)$/i.test(path)) {
    throw new Error('Invalid Hugging Face Cinema output path.')
  }
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const signed = await supabaseAdmin.storage.from(HF_CINEMA_BUCKET).createSignedUrl(path, 60 * 60)
  if (signed.error || !signed.data?.signedUrl) return null
  return signed.data.signedUrl
}
