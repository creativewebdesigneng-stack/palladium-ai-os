import { runChatPinned } from '@/lib/runtime/model-gateway.server'
import type { ChatResult } from '@/lib/runtime/model-gateway.base'

export type AstraXMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AstraXNativeChatRequest = {
  messages: AstraXMessage[]
  maxTokens?: number
  timeoutMs?: number
}

export type AstraXRuntimeConfiguration = {
  configured: true
  provider: 'compatible'
  model: string
  endpointHost: string
  endpointIsLoopback: boolean
}

function enabled(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase())
}

/**
 * Read and validate the existing Blackstar native provider configuration.
 * This is configuration validation only; it does not prove the endpoint is
 * reachable or that a remote tunnel terminates on the owner's workstation.
 */
export function getAstraXRuntimeConfiguration(
  env: Record<string, string | undefined> = process.env,
): AstraXRuntimeConfiguration | null {
  if (!enabled(env['BLACKSTAR_NATIVE_PRIMARY'])) return null

  const base = env['OPENAI_COMPATIBLE_BASE_URL']?.trim()
  const model = env['BLACKSTAR_NATIVE_MODEL']?.trim()
  if (!base || !model) return null

  let endpoint: URL
  try {
    endpoint = new URL(base)
  } catch {
    throw new Error('Astra X compatible endpoint URL is invalid.')
  }

  if (!['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('Astra X compatible endpoint URL violates the provider URL policy.')
  }

  const host = endpoint.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const endpointIsLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!endpointIsLoopback && (
    endpoint.protocol !== 'https:' ||
    !env['OPENAI_COMPATIBLE_API_KEY']?.trim() ||
    !enabled(env['ASTRA_X_LOCAL_BRIDGE_ATTESTED'])
  )) {
    throw new Error('A non-loopback Astra X endpoint requires HTTPS, a server-side bearer key and ASTRA_X_LOCAL_BRIDGE_ATTESTED=true.')
  }

  return {
    configured: true,
    provider: 'compatible',
    model,
    endpointHost: endpoint.hostname,
    endpointIsLoopback,
  }
}

/**
 * Run text-only Astra X inference through Blackstar's existing pinned gateway.
 * runChatPinned intentionally avoids cross-provider/model failover; tools are
 * omitted so this function cannot authorise or execute agent actions.
 */
export async function runAstraXNativeChat(
  request: AstraXNativeChatRequest,
): Promise<ChatResult> {
  const configuration = getAstraXRuntimeConfiguration()
  if (!configuration) {
    throw new Error('Astra X native runtime is not enabled and configured.')
  }

  if (!Array.isArray(request.messages) || request.messages.length < 1 || request.messages.length > 64) {
    throw new Error('Astra X request must contain between 1 and 64 messages.')
  }

  let totalCharacters = 0
  const messages = request.messages.map((message) => {
    if (!message || !['system', 'user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string' || !message.content.trim()) {
      throw new Error('Astra X messages must contain supported roles and non-empty text.')
    }
    totalCharacters += message.content.length
    if (message.content.length > 24_000 || totalCharacters > 96_000) {
      throw new Error('Astra X request exceeds the configured context input limit.')
    }
    return { role: message.role, content: message.content }
  })

  if (!messages.some((message) => message.role === 'user')) {
    throw new Error('Astra X request requires at least one user message.')
  }

  const maxTokens = request.maxTokens ?? 512
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 4096) {
    throw new Error('Astra X maxTokens must be an integer between 1 and 4096.')
  }
  const timeoutMs = request.timeoutMs ?? 45_000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error('Astra X timeoutMs must be between 1000 and 120000.')
  }

  const result = await runChatPinned({
    provider: 'compatible',
    model: configuration.model,
    messages,
    tools: [],
    temperature: 0,
    maxTokens,
    timeoutMs,
  })

  if (result.provider !== 'compatible' || result.model !== configuration.model) {
    throw new Error('Astra X pinned gateway returned an unexpected provider or model identity.')
  }
  return result
}
