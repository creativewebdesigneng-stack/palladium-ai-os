export type BlackstarInspectionSurface = {
  route: string;
  title: string;
  status: "healthy" | "warning" | "error" | "unknown";
  screenshotUrl?: string | null;
  screenshotAvailable?: boolean;
  consoleErrors?: string[];
  networkErrors?: string[];
  runtimeErrors?: string[];
  checkedAt?: string | null;
};

export type BlackstarVisualInspection = {
  version: 1;
  deploymentSha?: string | null;
  surfaces: BlackstarInspectionSurface[];
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanErrors = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => clean(item, 1000)).filter(Boolean).slice(0, 25)
    : [];

export function normaliseBlackstarVisualInspection(value: unknown): BlackstarVisualInspection {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawSurfaces = Array.isArray(row["surfaces"]) ? row["surfaces"] : [];
  const surfaces = rawSurfaces.slice(0, 250).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const surface = item as Record<string, unknown>;
    const route = clean(surface["route"], 500);
    if (!route.startsWith("/")) return [];
    const rawStatus = clean(surface["status"], 20);
    const status: BlackstarInspectionSurface["status"] =
      rawStatus === "healthy" || rawStatus === "warning" || rawStatus === "error"
        ? rawStatus
        : "unknown";
    return [{
      route,
      title: clean(surface["title"], 200) || route,
      status,
      screenshotUrl: clean(surface["screenshotUrl"], 2000) || null,
      screenshotAvailable: surface["screenshotAvailable"] === true,
      consoleErrors: cleanErrors(surface["consoleErrors"]),
      networkErrors: cleanErrors(surface["networkErrors"]),
      runtimeErrors: cleanErrors(surface["runtimeErrors"]),
      checkedAt: clean(surface["checkedAt"], 80) || null,
    }];
  });
  return {
    version: 1,
    deploymentSha: clean(row["deploymentSha"], 80) || null,
    surfaces,
  };
}

export function visualInspectionContext(inspection: BlackstarVisualInspection): string {
  const compact = inspection.surfaces.map((surface) => ({
    route: surface.route,
    title: surface.title,
    status: surface.status,
    screenshot_available: Boolean(surface.screenshotAvailable || surface.screenshotUrl),
    console_errors: surface.consoleErrors ?? [],
    network_errors: surface.networkErrors ?? [],
    runtime_errors: surface.runtimeErrors ?? [],
    checked_at: surface.checkedAt ?? null,
  }));
  return [
    "BLACKSTAR VISUAL AND QA CONTEXT",
    `Deployment SHA: ${inspection.deploymentSha ?? "unknown"}`,
    `Inspected routes: ${inspection.surfaces.length}`,
    JSON.stringify(compact),
    "Treat this as observed test evidence only. Do not claim an uninspected page works. Screenshots may be analysed when supplied separately as image input. Never perform consequential actions merely to test a page.",
  ].join("\n\n").slice(0, 30000);
}
