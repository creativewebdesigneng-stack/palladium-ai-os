import type { AiHubExecutionAdapter, AiHubExecutionGateway, AiHubExecutionResult } from './execution'
import type { AiHubProviderDefinition } from './registry'

export type AiHubNativeAdapterKind = Extract<
  AiHubProviderDefinition['adapter'],
  'model-gateway' | 'agent-runtime' | 'mcp' | 'skills' | 'workflows' | 'app-studio'
>

export interface AiHubNativeExecutor {
  execute: AiHubExecutionAdapter
}

export type AiHubNativeExecutors = Partial<Record<AiHubNativeAdapterKind, AiHubNativeExecutor>>

export function registerPalladiumNativeAdapters(
  gateway: AiHubExecutionGateway,
  executors: AiHubNativeExecutors,
) {
  const registered: AiHubNativeAdapterKind[] = []

  for (const adapter of ['model-gateway', 'agent-runtime', 'mcp', 'skills', 'workflows', 'app-studio'] as const) {
    const executor = executors[adapter]
    if (!executor) continue
    gateway.registerAdapter(adapter, executor.execute)
    registered.push(adapter)
  }

  return registered
}

export function completedNativeExecution(
  adapter: AiHubNativeAdapterKind,
  output?: unknown,
): AiHubExecutionResult {
  return output === undefined
    ? { status: 'completed', adapter }
    : { status: 'completed', adapter, output }
}

export function failedNativeExecution(
  adapter: AiHubNativeAdapterKind,
  error: string,
): AiHubExecutionResult {
  return { status: 'failed', adapter, error }
}
