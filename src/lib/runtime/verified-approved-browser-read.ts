/** Minimal user-visible proof from an approved read-only public browser task.
 * Never contains cookies, HTML scripts, browser storage or credential fields.
 * An oversized/partial read is omitted rather than marked as an exact quote.
 */
export type VerifiedApprovedBrowserRead = {
  kind: 'approved_public_read';
  provider: 'playwright';
  simulated: false;
  url: string;
  text: string;
  characters: number;
};
type Json = Record<string, unknown>;

export function verifiedApprovedBrowserRead(
  approvedInput: unknown,
  toolOutput: unknown,
): VerifiedApprovedBrowserRead | null {
  if (!approvedInput || typeof approvedInput !== 'object' || Array.isArray(approvedInput)) return null;
  if (!toolOutput || typeof toolOutput !== 'object' || Array.isArray(toolOutput)) return null;
  const input = approvedInput as Json, output = toolOutput as Json;
  if (input['persist_session'] === true || output['provider'] !== 'playwright' || output['simulated'] !== false) return null;
  const plan = input['steps'], result = output['result'];
  if (!Array.isArray(plan) || !result || typeof result !== 'object' || Array.isArray(result)) return null;
  const evidence = result as Json;
  if (evidence['ok'] !== true || evidence['completed_steps'] !== plan.length || !Array.isArray(evidence['outputs']) ||
      evidence['outputs'].length !== plan.length) return null;
  const nav = plan[0] as Json | undefined;
  if (nav?.['action'] !== 'navigate' || typeof nav['url'] !== 'string') return null;
  let approvedUrl: URL;
  try {
    approvedUrl = new URL(nav['url']);
    if (approvedUrl.protocol !== 'https:' || approvedUrl.username || approvedUrl.password ||
        approvedUrl.search || approvedUrl.hash) return null;
  } catch { return null; }
  let lastRead: VerifiedApprovedBrowserRead | null = null;
  for (let i = 0; i < plan.length; i++) {
    const planned = plan[i] as Json | undefined;
    const step = evidence['outputs'][i] as Json | undefined;
    if (!planned || !step || step['action'] !== planned['action'] ||
        !step['result'] || typeof step['result'] !== 'object' || Array.isArray(step['result'])) return null;
    const stepResult = step['result'] as Json;
    if (stepResult['simulated'] === true) return null;
    if (planned['action'] !== 'read') continue;
    if (typeof stepResult['text'] !== 'string' || !stepResult['text'].trim() ||
        stepResult['text'].length > 8000 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(stepResult['text'])) return null;
    if (typeof stepResult['url'] !== 'string') return null;
    let resultUrl: URL;
    try { resultUrl = new URL(stepResult['url']); } catch { return null; }
    if (resultUrl.protocol !== 'https:' || resultUrl.origin !== approvedUrl.origin ||
        resultUrl.username || resultUrl.password || resultUrl.search || resultUrl.hash) return null;
    lastRead = {
      kind: 'approved_public_read', provider: 'playwright', simulated: false,
      url: stepResult['url'], text: stepResult['text'], characters: stepResult['text'].length,
    };
  }
  return lastRead;
}
