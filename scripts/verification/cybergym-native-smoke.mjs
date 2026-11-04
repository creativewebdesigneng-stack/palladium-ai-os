/**
 * Opt-in, owner-local Astra model smoke check for CyberGym preparation.
 * This is NOT a CyberGym run or proof of GPU execution. It makes exactly
 * two HTTP calls to a validated 127.0.0.1 endpoint, with no redirects,
 * credentials, tools, memory, public ingress, or provider fallbacks.
 */
import { request } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { validateCyberGymPreflightPlan } from './cybergym-preflight.mjs'

export const ASTRA_CYBERGYM_SMOKE_SCHEMA = 'blackstar.cybergym.native-smoke.v1'
const EXPECTED_MODEL = 'qwen3:8b-q4_K_M'
const MAX_RESPONSE_BYTES = 65_536
const REQUEST_TIMEOUT_MS = 60_000

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Unprivileged localhost HTTP only. Hardcoded hostname and fixed request
 * paths prevent the response (or a config field) from redirecting to
 * cloud/tunnel services. Never log model output or arbitrary HTTP bodies.
 */
async function localJson(port, path, method, body, timeoutMs = REQUEST_TIMEOUT_MS) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local model port')
  if (!['/v1/models', '/v1/chat/completions'].includes(path)) throw new Error('Disallowed model path')
  if (!['GET', 'POST'].includes(method)) throw new Error('Disallowed model method')
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > REQUEST_TIMEOUT_MS) {
    throw new Error('Invalid bounded request timeout')
  }
  const payload = body === undefined ? undefined : JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = request({
      protocol: 'http:',
      hostname: '127.0.0.1',
      family: 4,
      port,
      path,
      method,
      agent: false,
      timeout: timeoutMs,
      headers: {
        accept: 'application/json',
        ...(payload === undefined ? {} : {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        }),
      },
    }, (res) => {
      let size = 0
      const chunks = []
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error('Local model HTTP status was not 200 (redirects prohibited)'))
        return
      }
      res.on('data', (chunk) => {
        size += chunk.length
        if (size > MAX_RESPONSE_BYTES) {
          req.destroy(new Error('Local model response exceeded the 64 KiB cap'))
          return
        }
        chunks.push(chunk)
      })
      res.on('error', reject)
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          if (!object(data)) throw new Error('Expected a JSON object')
          resolve(data)
        } catch {
          reject(new Error('Local model response was not valid bounded JSON'))
        }
      })
    })
    req.on('timeout', () => req.destroy(new Error('Local model request timed out')))
    req.on('error', (error) => reject(new Error(
      /timed out/i.test(error.message) ? 'Local model request timed out' :
      /64 KiB cap/.test(error.message) ? 'Local model response exceeded the 64 KiB cap' :
      'Local model request failed (no provider fallback attempted)'
    )))
    req.end(payload)
  })
}

/**
 * This performs a real, no-tool generation ONLY when the operator explicitly
 * invokes the CLI on the machine hosting Astra.
 */
export async function probeLocalAstraForCyberGym(config, options = {}) {
  validateCyberGymPreflightPlan(config)
  // Reject provider, proxy, credential and fallback overrides before any network call.
  if (!object(options) || Object.keys(options).some((key) => key !== 'requestTimeoutMs')) {
    throw new Error('Unsupported local smoke options')
  }
  const timeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS
  const port = Number(new URL(config.nativeModel.baseUrl).port)
  return probeBoundedLoopbackAstra(port, timeoutMs)
}

/**
 * Fixed host-side no-tool smoke: reuses the same safe transport as the existing
 * CyberGym preflight, but requires no fake dataset/source SHAs for this purely
 * benign local path. No agent/container is given network access to Ollama.
 */
export async function probeOwnerLocalAstraNoTool() {
  if (process.platform !== 'win32') throw new Error('Local Windows controller required')
  return probeBoundedLoopbackAstra(11434, REQUEST_TIMEOUT_MS)
}

/**
 * Categorise only visible, final message acceptance. Never persist, echo,
 * log or inspect private reasoning, prompt bodies, hidden fields or text.
 * The content is compared locally against a fixed literal and discarded.
 */
export function classifyAstraSmokeCompletion(response) {
  const first = Array.isArray(response?.choices) ? response.choices[0] : null
  if (!object(first) || !object(first.message)) return 'missing_message'
  if (first.finish_reason !== 'stop') {
    if (first.finish_reason === 'length') return 'finish_length'
    if (first.finish_reason === 'content_filter') return 'finish_content_filter'
    if (first.finish_reason === null || first.finish_reason === undefined) return 'finish_missing'
    return 'non_stop_finish'
  }
  const content = first.message.content
  if (typeof content !== 'string' || content.trim() === '') return 'empty_content'
  const visible = content.trim()
  if (visible === 'READY') return null
  if (/^READY[.!?]+$/.test(visible)) return 'punctuation_after_ready'
  if (visible.toUpperCase() === 'READY') return 'case_mismatch'
  return 'content_mismatch'
}

export class AstraSmokeCompletionError extends Error {
  constructor(reason) {
    // Static generic message preserves earlier consumers, without raw output.
    super('Local Astra generated an invalid or incomplete smoke response')
    this.name = 'AstraSmokeCompletionError'
    this.reason = [
      'missing_message', 'non_stop_finish', 'finish_length',
      'finish_content_filter', 'finish_missing', 'empty_content',
      'punctuation_after_ready', 'case_mismatch', 'content_mismatch',
    ].includes(reason) ? reason : 'content_mismatch'
  }
}

async function probeBoundedLoopbackAstra(port, timeoutMs) {
  const startedAt = Date.now()
  const models = await localJson(port, '/v1/models', 'GET', undefined, timeoutMs)
  if (!Array.isArray(models.data) || !models.data.some(
    (entry) => object(entry) && entry.id === EXPECTED_MODEL
  )) {
    throw new Error('Pinned native Astra model not advertised by localhost endpoint')
  }

  const inferenceStart = Date.now()
  const response = await localJson(port, '/v1/chat/completions', 'POST', {
    model: EXPECTED_MODEL,
    stream: false,
    temperature: 0,
    max_tokens: 64,
    // Ollama OpenAI compatibility: request no thinking explicitly.
    // /no_think alone may be ignored for Qwen3 and exhaust this small budget.
    // If the backend ignores the setting, the strict finish/content gate still blocks.
    reasoning_effort: 'none',
    messages: [
      { role: 'system', content: 'This is a local-only transport smoke test. Do not use tools, memory, files or network. Reply with the exact word READY.' },
      { role: 'user', content: '/no_think\nReply with exactly READY.' },
    ],
  }, timeoutMs)
  const elapsedMs = Date.now() - inferenceStart
  if (response.model !== EXPECTED_MODEL) {
    throw new Error('Local inference model identity did not match pinned Astra model')
  }
  const completionFailure = classifyAstraSmokeCompletion(response)
  if (completionFailure !== null) {
    throw new AstraSmokeCompletionError(completionFailure)
  }
  return {
    schema: ASTRA_CYBERGYM_SMOKE_SCHEMA,
    status: 'LOCAL_MODEL_SMOKE_PASSED_BENCHMARK_BLOCKED',
    transport: '127.0.0.1-only',
    provider: 'compatible',
    model: EXPECTED_MODEL,
    modelsEndpoint: 'PASS',
    noToolCompletion: 'PASS',
    completionLatencyMs: elapsedMs,
    totalLatencyMs: Date.now() - startedAt,
    gpuExecutionVerified: false,
    benchmarkExecuted: false,
    officialBenchmarkScore: null,
    independentlyAttested: false,
    executableApprovalGranted: false,
  }
}

async function main() {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node scripts/verification/cybergym-native-smoke.mjs <preflight.json>')
  }
  const configPath = process.argv[2]
  const stats = statSync(configPath)
  if (!stats.isFile() || stats.size > 16_384) throw new Error('Preflight config must be a regular file no larger than 16 KiB')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  const result = await probeLocalAstraForCyberGym(config)
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write('CyberGym native smoke BLOCKED: ' +
      (error instanceof Error ? error.message : 'unknown error') + '\n')
    process.exitCode = 1
  })
}
