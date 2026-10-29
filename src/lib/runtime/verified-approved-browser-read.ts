/** Bounded, exact public source evidence from a real, approved, ephemeral browser task.
 * The generated model answer remains separate and may not be verbatim.
 * Never include cookies, browser storage, credentials, arbitrary tool JSON or HTML.
 */
export type VerifiedApprovedBrowserRead = {
  kind: 'approved_public_read';
  provider: 'playwright';
  simulated: false;
  url: string;
  text: string;
  characters: number;
  /** Exact worker field strings, in operator-approved selector order. */
  fields?: Array<{ name: string; text: string }>;
};

type Json = Record<string, unknown>;
const MAX_SOURCE_CHARACTERS = 8000;
const INVALID_TEXT = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

function cleanSourceText(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim()) &&
    value.length <= MAX_SOURCE_CHARACTERS && !INVALID_TEXT.test(value);
}

function sameApprovedPublicUrl(value: unknown, approved: URL): value is string {
  if (typeof value !== 'string') return false;
  try {
    const actual = new URL(value);
    return actual.href === approved.href && actual.protocol === 'https:' &&
      !actual.username && !actual.password && !actual.search && !actual.hash;
  } catch { return false; }
}

/** No browser calls: validates only independently completed, returned worker evidence. */
export function verifiedApprovedBrowserRead(
  approvedInput: unknown,
  toolOutput: unknown,
): VerifiedApprovedBrowserRead | null {
  if (!approvedInput || typeof approvedInput !== 'object' || Array.isArray(approvedInput)) return null;
  if (!toolOutput || typeof toolOutput !== 'object' || Array.isArray(toolOutput)) return null;
  const input = approvedInput as Json, output = toolOutput as Json;
  if (input['persist_session'] === true || output['profile_persisted'] === true ||
      output['provider'] !== 'playwright' || output['simulated'] !== false) return null;
  const plan = input['steps'], result = output['result'];
  if (!Array.isArray(plan) || plan.length < 2 || plan.length > 8 ||
      !result || typeof result !== 'object' || Array.isArray(result)) return null;
  const evidence = result as Json;
  if (evidence['ok'] !== true || evidence['completed_steps'] !== plan.length ||
      !Array.isArray(evidence['outputs']) || evidence['outputs'].length !== plan.length) return null;

  const nav = plan[0] as Json | undefined;
  if (!nav || nav['action'] !== 'navigate' || typeof nav['url'] !== 'string') return null;
  let approvedUrl: URL;
  try {
    approvedUrl = new URL(nav['url']);
    if (approvedUrl.protocol !== 'https:' || approvedUrl.username || approvedUrl.password ||
        approvedUrl.search || approvedUrl.hash) return null;
  } catch { return null; }

  let verified: VerifiedApprovedBrowserRead | null = null;
  for (let i = 0; i < plan.length; i++) {
    const planned = plan[i] as Json | undefined;
    const step = evidence['outputs'][i] as Json | undefined;
    if (!planned || typeof planned !== 'object' || Array.isArray(planned) ||
        !step || typeof step !== 'object' || Array.isArray(step) ||
        step['action'] !== planned['action'] ||
        !step['result'] || typeof step['result'] !== 'object' || Array.isArray(step['result'])) return null;
    const stepResult = step['result'] as Json;
    if (stepResult['simulated'] === true ||
        (planned['url'] !== undefined && !sameApprovedPublicUrl(planned['url'], approvedUrl))) return null;
    if (planned['action'] === 'navigate') {
      if (i !== 0 || stepResult['ok'] !== true ||
          !sameApprovedPublicUrl(stepResult['url'], approvedUrl)) return null;
      continue;
    }
    if (planned['action'] !== 'read' && planned['action'] !== 'extract') return null;
    if (!sameApprovedPublicUrl(stepResult['url'], approvedUrl)) return null;

    if (planned['action'] === 'read') {
      if (!cleanSourceText(stepResult['text'])) return null;
      verified = {
        kind: 'approved_public_read', provider: 'playwright', simulated: false,
        url: stepResult['url'], text: stepResult['text'],
        characters: stepResult['text'].length,
      };
      continue;
    }

    // Match ONLY original operator-approved selectors and field names.
    // The worker returns an object for "extract", not a "text" property.
    const requested = planned['fields'], received = stepResult['fields'];
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 16 ||
        !received || typeof received !== 'object' || Array.isArray(received)) return null;
    const actualFields = received as Json;
    if (Object.keys(actualFields).length !== requested.length) return null;
    const fields: Array<{ name: string; text: string }> = [];
    const seen = new Set<string>();
    for (const expected of requested) {
      if (!expected || typeof expected !== 'object' || Array.isArray(expected)) return null;
      const field = expected as Json;
      const name = field['name'];
      if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_ -]{0,79}$/.test(name) ||
          typeof field['selector'] !== 'string' || !field['selector'] ||
          seen.has(name) || !Object.hasOwn(actualFields, name)) return null;
      seen.add(name);
      const value = actualFields[name];
      if (!cleanSourceText(value)) return null;
      fields.push({ name, text: value });
    }
    const text = fields.map(field => field.text).join('\n\n');
    if (text.length > MAX_SOURCE_CHARACTERS) return null;
    verified = {
      kind: 'approved_public_read', provider: 'playwright', simulated: false,
      url: stepResult['url'], text, characters: text.length, fields,
    };
  }
  return verified;
}
