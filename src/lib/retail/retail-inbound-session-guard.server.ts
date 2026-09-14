import { supabaseAdmin } from '@/integrations/supabase/client.server';

type AdminSb = { from: (table: string) => any };
const adminSb = supabaseAdmin as unknown as AdminSb;

const CALL_SID = /^CA[0-9a-fA-F]{32}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

function webhookError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function param(params: URLSearchParams, key: string, max = 80) {
  return (params.get(key) ?? '').trim().slice(0, max);
}

/**
 * Defense-in-depth for signed Twilio retries. A provider CallSid is globally
 * unique, but Blackstar still refuses to reuse a stored session unless the
 * endpoint, owner/workspace/profile and caller/called tuple remain identical.
 */
export async function assertRetailInboundSessionIdentity(params: URLSearchParams) {
  const callSid = param(params, 'CallSid');
  const caller = param(params, 'From');
  const called = param(params, 'To');
  if (!CALL_SID.test(callSid) || !E164.test(called)) throw webhookError('Invalid Twilio call identity.', 400);

  const endpointResult = await adminSb.from('retail_reception_voice_endpoints')
    .select('id,user_id,workspace_id,profile_id')
    .eq('provider', 'twilio')
    .eq('phone_number', called)
    .eq('active', true)
    .eq('webhook_configured', true)
    .maybeSingle();
  if (endpointResult.error) throw new Error(endpointResult.error.message);
  if (!endpointResult.data) return;

  const sessionResult = await adminSb.from('retail_reception_voice_sessions')
    .select('id,user_id,workspace_id,profile_id,endpoint_id,caller_phone,called_phone')
    .eq('provider', 'twilio')
    .eq('provider_call_sid', callSid)
    .maybeSingle();
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  if (!sessionResult.data) return;

  const endpoint = endpointResult.data;
  const session = sessionResult.data;
  const callerMismatch = Boolean(session.caller_phone && E164.test(caller) && session.caller_phone !== caller);
  const identityMismatch =
    session.endpoint_id !== endpoint.id ||
    session.user_id !== endpoint.user_id ||
    session.workspace_id !== endpoint.workspace_id ||
    session.profile_id !== endpoint.profile_id ||
    session.called_phone !== called ||
    callerMismatch;

  if (identityMismatch) throw webhookError('Twilio call session identity mismatch.', 409);
}
