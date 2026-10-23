#!/usr/bin/env node
/** Blackstar local candidate diagnostic. No port exposure, secrets, writes or certification claims. */
import { pathToFileURL } from 'node:url'
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])
export function parseArgs(argv) {
  const args = { baseUrl: 'http://127.0.0.1:11434/v1', model: '', probe: false, timeoutMs: 30000 }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--help') return { ...args, help: true }
    if (flag === '--probe') { args.probe = true; continue }
    if (['--model', '--base-url', '--timeout-ms'].includes(flag)) {
      const value = argv[++i]
      if (!value || value.startsWith('--')) throw new Error('Missing argument value')
      if (flag === '--model') args.model = value
      if (flag === '--base-url') args.baseUrl = value
      if (flag === '--timeout-ms') args.timeoutMs = Number(value)
      continue
    }
    throw new Error('Unknown argument')
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 1000 || args.timeoutMs > 120000) throw new Error('Invalid timeout')
  return args
}
export function assertLoopbackCompatibleBase(value) {
  let url
  try { url = new URL(value) } catch { throw new Error('Invalid compatible base URL') }
  if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\\/+$/, '') !== '/v1') {
    throw new Error('For safety, only a loopback HTTP /v1 URL without embedded credentials is allowed')
  }
  return url.origin + '/v1'
}
export function parseModelIds(json) {
  if (!json || !Array.isArray(json.data)) throw new Error('Invalid models response')
  return json.data.map(x => x?.id).filter(x => typeof x === 'string' && x.length > 0)
}
export function parseChatResult(json) {
  const text = json?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('Invalid chat response')
  return { nonempty: true, characters: text.trim().length }
}
function safeError(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout'
  if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') return 'connection_refused'
  return 'request_failed'
}
export async function inspectLocalCandidate(args, fetchImpl = fetch) {
  const base = assertLoopbackCompatibleBase(args.baseUrl)
  const report = {
    kind: 'blackstar_astra_local_candidate_diagnostic', certified: false,
    transport: 'loopback_only', modelListing: 'not_checked',
    requestedModelAvailable: null, inference: args.probe ? 'not_started' : 'not_requested',
    responseShapeValid: false,
  }
  const headers = { Accept: 'application/json' }
  // Never print the optional token; only send it to the validated loopback endpoint.
  if (process.env.OPENAI_COMPATIBLE_API_KEY) headers.Authorization = `Bearer ${process.env.OPENAI_COMPATIBLE_API_KEY}`
  let models
  try {
    const response = await fetchImpl(`${base}/models`, { headers, signal: AbortSignal.timeout(args.timeoutMs) })
    if (!response.ok) { report.modelListing = `http_${response.status}`; return report }
    models = parseModelIds(await response.json())
    report.modelListing = 'ok'
    report.advertisedModelCount = models.length
    if (args.model) report.requestedModelAvailable = models.includes(args.model)
  } catch (error) { report.modelListing = safeError(error); return report }
  if (!args.probe) return report
  if (!args.model) { report.inference = 'model_required'; return report }
  if (!models.includes(args.model)) { report.inference = 'model_not_listed'; return report }
  try {
    const response = await fetchImpl(`${base}/chat/completions`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(args.timeoutMs),
      body: JSON.stringify({ model: args.model, stream: false, max_tokens: 16,
        messages: [{ role: 'user', content: 'Reply with OK.' }] }),
    })
    if (!response.ok) { report.inference = `http_${response.status}`; return report }
    const result = parseChatResult(await response.json())
    report.inference = 'real_response_received'
    report.responseShapeValid = result.nonempty
    report.responseCharacters = result.characters
  } catch (error) { report.inference = error instanceof Error && error.message === 'Invalid chat response' ? 'invalid_response_shape' : safeError(error) }
  return report
}
export async function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv)
    if (args.help) {
      console.log('Usage: node scripts/verification/astra-local-candidate-check.mjs [--base-url http://127.0.0.1:11434/v1] [--model MODEL] [--probe] [--timeout-ms 30000]')
      console.log('Lists local models. --probe opts into one bounded real generation; no ports or keys are exposed.')
      return 0
    }
    const report = await inspectLocalCandidate(args)
    console.log(JSON.stringify(report, null, 2))
    return report.inference === 'real_response_received' || (!args.probe && report.modelListing === 'ok') ? 0 : 1
  } catch (error) {
    console.error(JSON.stringify({ kind: 'blackstar_astra_local_candidate_diagnostic', certified: false,
      error: error?.message?.startsWith('For safety') ? 'non_loopback_url_rejected' : 'invalid_arguments' }))
    return 2
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main()
