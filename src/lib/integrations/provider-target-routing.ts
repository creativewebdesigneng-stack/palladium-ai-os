export type ProviderTargetDescriptor = {
  id: string;
  name?: string | null;
};

export type ProviderCatalogueEntry = {
  id: string;
  name?: string | null;
};

const EXPLICIT_TARGET_ALIASES: Record<string, readonly string[]> = {
  huggingface: ["hugging-face"],
  adobe: ["adobe-creative-cloud", "creative-cloud"],
  runway: ["runwayml", "runway-ml"],
  heygen: ["hey-gen"],
  semrush: ["sem-rush"],
  sharepoint: ["microsoft-sharepoint", "sharepoint-online"],
  posthog: ["post-hog"],
};

export function normalizeProviderIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function providerTargetIdentityKeys(target: ProviderTargetDescriptor): string[] {
  const raw = [
    target.id,
    target.name ?? "",
    ...(EXPLICIT_TARGET_ALIASES[target.id.trim().toLowerCase()] ?? []),
  ];
  return [...new Set(raw.map(normalizeProviderIdentity).filter(Boolean))];
}

export function providerTargetMatches(
  target: ProviderTargetDescriptor,
  candidate: ProviderCatalogueEntry,
): boolean {
  const targetKeys = new Set(providerTargetIdentityKeys(target));
  if (!targetKeys.size) return false;
  return [candidate.id, candidate.name ?? ""]
    .map(normalizeProviderIdentity)
    .filter(Boolean)
    .some((key) => targetKeys.has(key));
}

export function resolveProviderTargetMatch<T extends ProviderCatalogueEntry>(
  target: ProviderTargetDescriptor,
  candidates: readonly T[],
): T | null {
  const targetId = target.id.trim().toLowerCase();
  const exact = candidates.find((candidate) => candidate.id.trim().toLowerCase() === targetId);
  if (exact) return exact;

  const matches = candidates.filter((candidate) => providerTargetMatches(target, candidate));
  if (matches.length === 1) return matches[0] ?? null;
  if (matches.length === 0) return null;

  const targetIdKey = normalizeProviderIdentity(target.id);
  const targetNameKey = normalizeProviderIdentity(target.name ?? "");
  const scored = matches
    .map((candidate) => {
      const idKey = normalizeProviderIdentity(candidate.id);
      const nameKey = normalizeProviderIdentity(candidate.name ?? "");
      const score =
        (idKey === targetIdKey ? 4 : 0) +
        (targetNameKey && nameKey === targetNameKey ? 3 : 0) +
        (targetNameKey && idKey === targetNameKey ? 2 : 0);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));

  if (!scored[0] || scored[0].score === 0) return null;
  if (scored[1] && scored[1].score === scored[0].score) return null;
  return scored[0].candidate;
}
