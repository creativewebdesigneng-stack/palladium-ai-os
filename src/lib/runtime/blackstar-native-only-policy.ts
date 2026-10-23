/** Deployment-scoped transport restriction; endpoint/model ownership requires operator verification. */
export function blackstarNativeOnlyEnabled(): boolean {
  return ['1', 'true', 'yes', 'on'].includes(process.env['BLACKSTAR_NATIVE_ONLY']?.trim().toLowerCase() ?? '');
}

export function enforceBlackstarNativeOnly(args: {
  provider: string;
  model: string;
  allowedProviders?: readonly string[];
}): void {
  if (!blackstarNativeOnlyEnabled()) return;
  const endpoint = process.env['OPENAI_COMPATIBLE_BASE_URL']?.trim();
  const model = process.env['BLACKSTAR_NATIVE_MODEL']?.trim();
  if (!endpoint || !model) throw new Error('Blackstar-only inference requires a configured compatible endpoint and pinned native model. External fallback is disabled.');
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error('Blackstar-only inference endpoint is invalid.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Blackstar-only inference requires an HTTP(S) endpoint without URL credentials, query or fragment.');
  }
  if (args.provider !== 'compatible' || args.model.trim() !== model) {
    throw new Error('Blackstar-only inference permits only the configured compatible model. Select that route; external fallback is disabled.');
  }
  if (args.allowedProviders && !args.allowedProviders.includes('compatible')) {
    throw new Error('Blackstar-only inference is not permitted by this run’s provider policy.');
  }
}
