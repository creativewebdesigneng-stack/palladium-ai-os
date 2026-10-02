export type HuggingFaceStudioTask =
  | 'text-to-video'
  | 'image-to-video'
  | 'text-to-3d'
  | 'image-to-3d'

export type HuggingFaceStudioModel = {
  id: string
  task: HuggingFaceStudioTask
  downloads: number
  likes: number
  updatedAt: string | null
  inferenceProviders: string[]
  inferenceReady: boolean
  url: string
}

const HF_API = 'https://huggingface.co/api'
const HF_HOST = 'https://huggingface.co'
const ALLOWED_TASKS = new Set<HuggingFaceStudioTask>([
  'text-to-video',
  'image-to-video',
  'text-to-3d',
  'image-to-3d',
])

function token() {
  return (process.env['HF_TOKEN'] || process.env['HUGGINGFACE_TOKEN'] || '').trim()
}

function headers() {
  const value = token()
  return value
    ? { Accept: 'application/json', Authorization: `Bearer ${value}` }
    : { Accept: 'application/json' }
}

function safeTask(value: string): HuggingFaceStudioTask {
  if (!ALLOWED_TASKS.has(value as HuggingFaceStudioTask)) {
    throw new Error('Unsupported Hugging Face studio task.')
  }
  return value as HuggingFaceStudioTask
}

function parseProviderMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .filter(([, detail]) => detail && typeof detail === 'object' && (detail as Record<string, unknown>)['status'] === 'live')
    .map(([provider]) => provider)
    .slice(0, 20)
}

export async function discoverHuggingFaceStudioModels(args: {
  task: HuggingFaceStudioTask
  limit?: number
}) {
  const task = safeTask(args.task)
  const limit = Math.max(1, Math.min(24, Math.floor(args.limit ?? 12)))
  const query = new URLSearchParams({
    pipeline_tag: task,
    inference_provider: 'all',
    sort: 'downloads',
    direction: '-1',
    limit: String(limit),
    full: 'true',
  })

  const response = await fetch(`${HF_API}/models?${query.toString()}`, {
    headers: headers(),
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  const raw = await response.text()
  if (!response.ok) throw new Error(`Hugging Face model discovery failed (HTTP ${response.status}).`)

  let payload: unknown
  try { payload = JSON.parse(raw) } catch { throw new Error('Hugging Face model discovery returned invalid JSON.') }
  if (!Array.isArray(payload)) throw new Error('Hugging Face model discovery returned an invalid payload.')

  const models: HuggingFaceStudioModel[] = []
  for (const item of payload.slice(0, limit * 2)) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = typeof row['id'] === 'string' ? row['id'].trim() : ''
    if (!id || id.length > 240) continue
    const providers = parseProviderMap(row['inferenceProviderMapping'] ?? row['inference_provider_mapping'])
    models.push({
      id,
      task,
      downloads: Number.isFinite(Number(row['downloads'])) ? Number(row['downloads']) : 0,
      likes: Number.isFinite(Number(row['likes'])) ? Number(row['likes']) : 0,
      updatedAt: typeof row['lastModified'] === 'string' ? row['lastModified'] : null,
      inferenceProviders: providers,
      inferenceReady: providers.length > 0,
      url: `${HF_HOST}/${id}`,
    })
    if (models.length >= limit) break
  }

  return {
    task,
    tokenConfigured: Boolean(token()),
    models,
    note: 'Discovery reflects Hugging Face Hub metadata. A listed model is executable in Blackstar only when a live inference provider or dedicated endpoint is available and configured.',
  }
}

export async function getHuggingFaceStudioModelProviders(modelId: string) {
  const id = modelId.trim()
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(id)) throw new Error('Invalid Hugging Face model id.')
  const response = await fetch(`${HF_API}/models/${encodeURIComponent(id)}?expand=inferenceProviderMapping`, {
    headers: headers(),
    redirect: 'manual',
    signal: AbortSignal.timeout(12_000),
  })
  const raw = await response.text()
  if (!response.ok) throw new Error(`Hugging Face model lookup failed (HTTP ${response.status}).`)
  let payload: Record<string, unknown>
  try { payload = JSON.parse(raw) as Record<string, unknown> } catch { throw new Error('Hugging Face model lookup returned invalid JSON.') }
  return {
    id,
    providers: parseProviderMap(payload['inferenceProviderMapping'] ?? payload['inference_provider_mapping']),
    url: `${HF_HOST}/${id}`,
  }
}
