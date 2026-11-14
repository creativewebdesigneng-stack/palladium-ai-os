export type IndustryWorkspaceRecord = {
  id: string;
  name: string;
  industry: string;
  geography?: string | null;
  organisation_context?: string | null;
  objectives?: string | null;
  notes?: string | null;
  maturity?: Record<string, unknown> | null;
  opportunities?: unknown[] | null;
  risks?: unknown[] | null;
  roadmap?: unknown[] | null;
  benchmark?: Record<string, unknown> | null;
  supplier_assessments?: unknown[] | null;
  disruption_signals?: unknown[] | null;
};

export type IndustryOperatingPicture = {
  maturity?: Record<string, number>;
  suppliers?: Array<Record<string, unknown>>;
  growth?: Record<string, unknown>;
  opportunities?: Array<Record<string, unknown>>;
};

function text(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed || undefined;
}

function asRecords(value: unknown, max = 100): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .slice(0, max);
}

export function asMaturityScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const scores: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const score = Number(raw);
    if (Number.isInteger(score) && score >= 1 && score <= 5) scores[key.slice(0, 80)] = score;
  }
  return scores;
}

/** Merge a live operating picture into an existing owner workspace without dropping unrelated saved fields. */
export function mergeIndustryOperatingPicture(
  workspace: IndustryWorkspaceRecord,
  picture: IndustryOperatingPicture,
) {
  const name = workspace.name.trim().slice(0, 120);
  const industry = workspace.industry.trim().slice(0, 120);
  if (!name || !industry)
    throw new Error("Choose a saved industry workspace before storing this operating picture.");
  const benchmark =
    workspace.benchmark &&
    typeof workspace.benchmark === "object" &&
    !Array.isArray(workspace.benchmark)
      ? { ...workspace.benchmark }
      : {};
  if (picture.growth) benchmark["growth"] = picture.growth;
  const geography = text(workspace.geography, 160);
  const organisationContext = text(workspace.organisation_context, 4000);
  const objectives = text(workspace.objectives, 4000);
  const notes = text(workspace.notes, 8000);
  return {
    id: workspace.id,
    name,
    industry,
    ...(geography ? { geography } : {}),
    ...(organisationContext ? { organisation_context: organisationContext } : {}),
    ...(objectives ? { objectives } : {}),
    ...(notes ? { notes } : {}),
    maturity: picture.maturity
      ? asMaturityScores(picture.maturity)
      : asMaturityScores(workspace.maturity),
    opportunities: picture.opportunities
      ? asRecords(picture.opportunities)
      : asRecords(workspace.opportunities),
    risks: asRecords(workspace.risks),
    roadmap: asRecords(workspace.roadmap),
    benchmark,
    supplier_assessments: picture.suppliers
      ? asRecords(picture.suppliers)
      : asRecords(workspace.supplier_assessments),
    disruption_signals: asRecords(workspace.disruption_signals),
  };
}
