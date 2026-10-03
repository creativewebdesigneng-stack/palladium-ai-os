import { ACCEPTANCE_EVIDENCE_TABLES } from "./acceptance-catalog";

export type AcceptanceEvidenceEntry = {
  count?: number | null;
  available?: boolean;
};

export type AcceptanceEvidenceSnapshot = Record<
  string,
  AcceptanceEvidenceEntry | undefined
>;

export type AcceptanceEvidenceSource = {
  key: string;
  table: string;
  count: number;
  available: boolean;
  present: boolean;
};

export type AcceptanceEvidenceSummary = {
  linked: boolean;
  total: number | null;
  available: boolean;
  presentSources: number;
  sourceCount: number;
  sources: AcceptanceEvidenceSource[];
};

function safeCount(value: unknown) {
  const count = Number(value ?? 0);
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.floor(count);
}

export function acceptanceEvidenceTable(key: string) {
  return (
    ACCEPTANCE_EVIDENCE_TABLES[
      key as keyof typeof ACCEPTANCE_EVIDENCE_TABLES
    ] ?? key
  );
}

export function summarizeAcceptanceEvidence(
  keys: string[] | undefined,
  snapshot: AcceptanceEvidenceSnapshot | undefined,
): AcceptanceEvidenceSummary {
  const evidenceKeys = keys ?? [];
  if (evidenceKeys.length === 0) {
    return {
      linked: false,
      total: null,
      available: true,
      presentSources: 0,
      sourceCount: 0,
      sources: [],
    };
  }

  const sources = evidenceKeys.map((key) => {
    const entry = snapshot?.[key];
    const available = Boolean(entry) && entry?.available !== false;
    const count = available ? safeCount(entry?.count) : 0;

    return {
      key,
      table: acceptanceEvidenceTable(key),
      count,
      available,
      present: count > 0,
    };
  });

  return {
    linked: true,
    total: sources.reduce((sum, source) => sum + source.count, 0),
    available: sources.every((source) => source.available),
    presentSources: sources.filter((source) => source.present).length,
    sourceCount: sources.length,
    sources,
  };
}

export function recordedVerificationHasLinkedEvidence(
  status: string | null | undefined,
  summary: AcceptanceEvidenceSummary,
) {
  return (
    status === "verified"
    && summary.linked
    && summary.available
    && (summary.total ?? 0) > 0
  );
}
