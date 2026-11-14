const STAGES = new Set(["start", "build", "grow", "optimise", "expand", "transform"]);

export type CompanyStrategyAgenda = {
  goal: string;
  horizon: string;
  priorities: string[];
};

function text(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed || undefined;
}

function strings(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function records(value: unknown, max: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .slice(0, max);
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function at(workspace: Record<string, unknown>, key: string) {
  return workspace[key];
}

/** Keep the rest of a company workspace and store the strategy-room agenda on it. */
export function mergeCompanyStrategyAgenda(
  workspace: Record<string, unknown>,
  agenda: CompanyStrategyAgenda,
) {
  const name = text(at(workspace, "name"), 160);
  const id = at(workspace, "id");
  if (!name || typeof id !== "string")
    throw new Error("Choose a saved company workspace before storing this agenda.");
  const goal = agenda.goal.trim().slice(0, 500);
  const objectives = strings(at(workspace, "objectives"), 50, 500);
  if (goal && !objectives.includes(goal)) objectives.push(goal);
  const stageValue = at(workspace, "stage");
  const stage = typeof stageValue === "string" && STAGES.has(stageValue) ? stageValue : undefined;
  const industry = text(at(workspace, "industry"), 160);
  const geography = text(at(workspace, "geography"), 200);
  const mission = text(at(workspace, "mission"), 4000);
  const companyContext = text(at(workspace, "company_context"), 8000);
  const notes = text(at(workspace, "notes"), 12000);
  return {
    id,
    name,
    ...(industry ? { industry } : {}),
    ...(stage ? { stage } : {}),
    ...(geography ? { geography } : {}),
    ...(mission ? { mission } : {}),
    ...(companyContext ? { company_context: companyContext } : {}),
    objectives: objectives.slice(0, 50),
    priorities: agenda.priorities
      .map((item) => item.trim().slice(0, 500))
      .filter(Boolean)
      .slice(0, 50),
    risks: strings(at(workspace, "risks"), 50, 500),
    department_plan: record(at(workspace, "department_plan")),
    ai_workforce_plan: records(at(workspace, "ai_workforce_plan"), 100),
    kpis: records(at(workspace, "kpis"), 200),
    decisions: records(at(workspace, "decisions"), 200),
    leadership_cadence: {
      ...record(at(workspace, "leadership_cadence")),
      horizon: agenda.horizon.trim().slice(0, 120),
    },
    opportunities: records(at(workspace, "opportunities"), 200),
    ...(notes ? { notes } : {}),
  };
}
