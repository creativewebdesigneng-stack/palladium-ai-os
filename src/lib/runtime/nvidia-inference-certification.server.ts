import { writeAuditRequired } from '@/lib/platform/audit.server';
import { ProviderError } from './model-gateway.base';
import { runChatPinned } from './model-gateway.server';
import { nvidiaNimConfigured, nvidiaNimModel } from './nvidia-dell-infrastructure.server';

export const NVIDIA_INFERENCE_CERTIFICATION_MARKER = 'BLACKSTAR_NIM_HEALTH_OK';
const enabled = (value: string | undefined) =>
  ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase());

/**
 * Real, bounded, admin-initiated NVIDIA model inference certification.
 * Called only after a separate authenticated platform-admin check, by
 * explicit click. This requests tokens and can incur provider charges.
 * No fallback, no agent tools, no arbitrary prompts and no retry.
 */
export function nvidiaInferenceProbeEnabled() {
  return enabled(process.env['NVIDIA_NIM_INFERENCE_PROBE_ENABLED']) && nvidiaNimConfigured();
}

type Status = 'verified' | 'not_enabled' | 'invalid_response' | 'unauthorised' |
  'quota_exhausted' | 'rate_limited' | 'unavailable' | 'audit_unavailable';

type CertificationResult = {
  status: Status;
  checkedAt: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  auditReceiptId: string | null;
};

export async function certifyNvidiaInference(args: { userId: string }): Promise<CertificationResult> {
  const model = nvidiaNimModel();
  const checkedAt = new Date().toISOString();
  const result = (status: Status, inputTokens: number | null = null,
    outputTokens: number | null = null, auditReceiptId: string | null = null): CertificationResult =>
    ({ status, checkedAt, model, inputTokens, outputTokens, auditReceiptId });
  if (!nvidiaInferenceProbeEnabled()) return result('not_enabled');

  // A required intent audit must exist before any cost-bearing inference.
  // No generated content, credentials or endpoint identifiers are audited.
  let requestId: string;
  try {
    requestId = await writeAuditRequired({
      userId: args.userId, action: 'model.nvidia_probe_requested',
      status: 'success', targetType: 'model_provider', targetId: 'nvidia',
      metadata: { model, maxCompletionTokens: 32, chargedProvider: 'nvidia' },
    });
  } catch {
    return result('audit_unavailable');
  }

  let status: Status = 'unavailable';
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  try {
    const response = await runChatPinned({
      provider: 'nvidia',
      model,
      messages: [{ role: 'user', content:
        `Connection certification. Reply with exactly ${NVIDIA_INFERENCE_CERTIFICATION_MARKER} and nothing else.` }],
      tools: [],
      temperature: 0,
      maxTokens: 32,
      maxAttempts: 1,
      timeoutMs: 15_000,
      allowedProviders: ['nvidia'],
    });
    inputTokens = Number.isSafeInteger(response.usage.input) && response.usage.input >= 0
      ? response.usage.input : null;
    outputTokens = Number.isSafeInteger(response.usage.output) && response.usage.output >= 0
      ? response.usage.output : null;
    status = response.provider === 'nvidia' && response.model === model &&
      response.toolCalls.length === 0 &&
      response.text.trim() === NVIDIA_INFERENCE_CERTIFICATION_MARKER
      ? 'verified' : 'invalid_response';
  } catch (error) {
    if (error instanceof ProviderError) {
      status = error.status === 401 || error.status === 403 ? 'unauthorised'
        : error.status === 402 ? 'quota_exhausted'
        : error.status === 429 ? 'rate_limited'
        : 'unavailable';
    }
    // Upstream failure messages may contain private endpoint or provider data:
    // do not return or persist them.
  }

  try {
    const receiptId = await writeAuditRequired({
      userId: args.userId,
      action: 'model.nvidia_probe_result',
      status: status === 'verified' ? 'success' : 'failed',
      targetType: 'model_provider', targetId: 'nvidia',
      metadata: { requestId, model, result: status, checkedAt, inputTokens, outputTokens },
    });
    return result(status, inputTokens, outputTokens, receiptId);
  } catch {
    // Without durable outcome evidence we cannot claim verified inference,
    // even if the provider returned a good response.
    return result('audit_unavailable');
  }
}

/**
 * Separately opt-in, metered *model tool-call shape* acceptance.
 * This does NOT execute the requested tool, approve any agent action,
 * or certify the Blackstar agent approval/resume pipeline.
 */
export const NVIDIA_TOOL_CALL_PROBE_EXPRESSION = '8 * 9';

export function nvidiaToolCallProbeEnabled() {
  return enabled(process.env['NVIDIA_NIM_TOOL_PROBE_ENABLED']) && nvidiaNimConfigured();
}

export async function certifyNvidiaToolCalling(args: { userId: string }): Promise<CertificationResult> {
  const model = nvidiaNimModel();
  const checkedAt = new Date().toISOString();
  const result = (status: Status, inputTokens: number | null = null,
    outputTokens: number | null = null, auditReceiptId: string | null = null): CertificationResult =>
    ({ status, checkedAt, model, inputTokens, outputTokens, auditReceiptId });
  if (!nvidiaToolCallProbeEnabled()) return result('not_enabled');

  // No spend without a durable, owner-attributed intent record.
  let requestId: string;
  try {
    requestId = await writeAuditRequired({
      userId: args.userId, action: 'model.nvidia_tool_probe_requested',
      status: 'success', targetType: 'model_provider', targetId: 'nvidia',
      metadata: { model, maxCompletionTokens: 64, chargedProvider: 'nvidia',
        tool: 'calculator', toolExecuted: false },
    });
  } catch {
    return result('audit_unavailable');
  }

  let status: Status = 'unavailable';
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  try {
    const response = await runChatPinned({
      provider: 'nvidia',
      model,
      messages: [{ role: 'user', content:
        'Test tool-call formatting only. Call the calculator tool once with expression "8 * 9". Do not answer in prose.' }],
      tools: [{
        name: 'calculator',
        description: 'Return arithmetic result. This certification records the tool call only and never runs the tool.',
        parameters: {
          type: 'object', additionalProperties: false,
          properties: { expression: { type: 'string', enum: [NVIDIA_TOOL_CALL_PROBE_EXPRESSION] } },
          required: ['expression'],
        },
      }],
      temperature: 0,
      maxTokens: 64,
      maxAttempts: 1,
      timeoutMs: 15_000,
      allowedProviders: ['nvidia'],
    });
    inputTokens = Number.isSafeInteger(response.usage.input) && response.usage.input >= 0
      ? response.usage.input : null;
    outputTokens = Number.isSafeInteger(response.usage.output) && response.usage.output >= 0
      ? response.usage.output : null;
    const call = response.toolCalls.length === 1 ? response.toolCalls[0] : undefined;
    const params = call?.arguments;
    status = response.provider === 'nvidia' && response.model === model &&
      Boolean(call && typeof call.id === 'string' && call.id.trim() &&
        call.name === 'calculator' && params && typeof params === 'object' &&
        !Array.isArray(params) && Object.keys(params).length === 1 &&
        params.expression === NVIDIA_TOOL_CALL_PROBE_EXPRESSION)
      ? 'verified' : 'invalid_response';
    // IMPORTANT: Never dispatch response.toolCalls or execute calculator here.
  } catch (error) {
    if (error instanceof ProviderError) {
      status = error.status === 401 || error.status === 403 ? 'unauthorised'
        : error.status === 402 ? 'quota_exhausted'
        : error.status === 429 ? 'rate_limited' : 'unavailable';
    }
  }
  try {
    const receiptId = await writeAuditRequired({
      userId: args.userId, action: 'model.nvidia_tool_probe_result',
      status: status === 'verified' ? 'success' : 'failed',
      targetType: 'model_provider', targetId: 'nvidia',
      metadata: { requestId, model, result: status, checkedAt,
        inputTokens, outputTokens, tool: 'calculator', toolExecuted: false },
    });
    return result(status, inputTokens, outputTokens, receiptId);
  } catch {
    return result('audit_unavailable');
  }
}
