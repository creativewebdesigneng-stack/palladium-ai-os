import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { toAiHubSpiderReceipts } from './spider-receipts'

type Sb = { from: (table: string) => any }

function validateInput(input: unknown): { limit: number } {
  const candidate = input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)['limit'] : undefined
  const value = candidate === undefined ? 50 : candidate
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error('Spider evidence limit must be an integer from 1 to 100')
  }
  return { limit: value }
}

/**
 * Read-only, signed-in evidence feed. All rows are from the caller's own
 * approval_requests via the existing authenticated Supabase client and RLS.
 * This is not an independent execution verifier or live event stream.
 */
export const listAiHubSpiderReceipts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { data: rows, error } = await sb.from('approval_requests')
      .select('id,action_type,status,execution_status,executed_at,created_at,details')
      .eq('user_id', context.userId)
      .eq('action_type', 'ai_hub_execution')
      .order('created_at', { ascending: false })
      .limit(data.limit)
    if (error) throw new Error('Could not load AI Hub approval evidence')
    return { receipts: toAiHubSpiderReceipts((rows ?? []) as Record<string, unknown>[]) }
  })
