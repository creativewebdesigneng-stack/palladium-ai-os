/**
 * Blackstar AI Hub Spider: presentation-safe evidence derived exclusively from
 * already persisted approval_requests. No execution or new approvals happen here.
 */
export type AiHubSpiderReceiptStatus =
  | 'awaiting-approval' | 'approved-not-executed' | 'executing'
  | 'recorded-success' | 'recorded-failure' | 'not-executed'

export interface AiHubSpiderReceipt {
  id: string
  providerId: string
  capabilityId: string
  workloadId: string
  status: AiHubSpiderReceiptStatus
  createdAt: string
  executedAt: string | null
  source: 'approval_requests'
}

function safeDate(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null
}

function asDetails(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function classifyApprovalState(approval: unknown, execution: unknown): AiHubSpiderReceiptStatus {
  // Terminal outcomes must have been persisted by the established gateway;
  // an 'approved' request by itself is not an executed tool run.
  if (approval === 'approved' && execution === 'succeeded') return 'recorded-success'
  if (approval === 'approved' && execution === 'failed') return 'recorded-failure'
  if (approval === 'approved' && execution === 'executing') return 'executing'
  if (approval === 'approved' && execution == null) return 'approved-not-executed'
  if (approval === 'pending' && execution == null) return 'awaiting-approval'
  return 'not-executed'
}

export function toAiHubSpiderReceipts(rows: readonly Record<string, unknown>[]): AiHubSpiderReceipt[] {
  return rows.slice(0, 100).flatMap((row) => {
    if (row['action_type'] !== 'ai_hub_execution') return []
    const details = asDetails(row['details'])
    const id = row['id']
    const capabilityId = details?.['ai_hub_capability_id']
    const providerId = details?.['ai_hub_provider_id']
    const workloadId = details?.['ai_hub_workload_id']
    const createdAt = safeDate(row['created_at'])
    if (
      typeof id !== 'string' || !id ||
      typeof capabilityId !== 'string' || !capabilityId ||
      typeof providerId !== 'string' || !providerId ||
      typeof workloadId !== 'string' || !workloadId ||
      !createdAt
    ) return []
    const persistedStatus = classifyApprovalState(row['status'], row['execution_status'])
    const terminal = persistedStatus === 'recorded-success' || persistedStatus === 'recorded-failure'
    const persistedExecutionDate = safeDate(row['executed_at'])
    // A terminal gateway status without a valid completion timestamp is
    // incomplete evidence, not proof that execution finished.
    const status = terminal && !persistedExecutionDate ? 'not-executed' : persistedStatus
    const executedAt = terminal && persistedExecutionDate ? persistedExecutionDate : null

    // Explicitly allowlist fields. Never pass through prompt input, raw MCP
    // arguments, approval details, execution_result or fingerprint metadata.
    return [{
      id,
      providerId,
      capabilityId,
      workloadId,
      status,
      createdAt,
      executedAt,
      source: 'approval_requests' as const,
    }]
  })
}

/**
 * Match a receipt to the precise registered execution resource.
 * AI Hub persists the workload prefix for each executable kind, so a tool,
 * agent and workflow sharing a provider and ID cannot inherit each other's
 * approval or recorded gateway outcome.
 */
export function receiptsForSpiderNode(
  receipts: readonly AiHubSpiderReceipt[],
  node: { providerId: string; kind: string; id: string },
): AiHubSpiderReceipt[] {
  const workloadId = node.kind === 'agent' ? `agent:${node.id}`
    : node.kind === 'workflow' ? `workflow:${node.id}`
      : node.kind === 'tool' && node.providerId.startsWith('external-mcp:')
        ? `external-mcp:${node.id}`
        : null
  if (!workloadId) return []
  return receipts.filter((item) =>
    item.providerId === node.providerId &&
    item.capabilityId === node.id &&
    item.workloadId === workloadId)
}

/**
 * Report only the most recently requested approval state for a registered
 * resource. Showing an older success while a newer request is pending would
 * misleadingly suggest that the current task has completed.
 * Server results arrive newest-first, but use timestamps here to avoid relying
 * on the order when this helper is called with other bounded receipt arrays.
 */
export function latestSpiderReceiptForNode(
  receipts: readonly AiHubSpiderReceipt[],
  node: { providerId: string; kind: string; id: string },
): AiHubSpiderReceipt | null {
  const matching = receiptsForSpiderNode(receipts, node)
  return matching.reduce<AiHubSpiderReceipt | null>((latest, receipt) => {
    if (!latest || Date.parse(receipt.createdAt) > Date.parse(latest.createdAt)) return receipt
    return latest
  }, null)
}
