import type { BlackstarInspectionSurface } from "./visual-inspection";

export type BrowserQaEvidence = {
  url?: string;
  title?: string;
  status?: number | null;
  screenshotDataUrl?: string;
  consoleErrors?: string[];
  pageErrors?: string[];
  networkErrors?: string[];
  httpErrors?: string[];
  checkedAt?: string;
  readOnly?: boolean;
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const errors = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => clean(item, 1000)).filter(Boolean).slice(0, 25) : [];

export function normaliseBrowserQaEvidence(route: string, value: unknown): {
  surface: BlackstarInspectionSurface;
  screenshotDataUrl: string | null;
} {
  if (!route.startsWith("/")) throw new Error("Visual Operator requires an application route.");
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  if (row["readOnly"] !== true) throw new Error("Visual Operator rejected non-read-only browser evidence.");

  const screenshot = clean(row["screenshotDataUrl"], 8_000_000);
  const screenshotDataUrl = screenshot.startsWith("data:image/png;base64,") ? screenshot : null;
  const consoleErrors = errors(row["consoleErrors"]);
  const pageErrors = errors(row["pageErrors"]);
  const networkErrors = [...errors(row["networkErrors"]), ...errors(row["httpErrors"])].slice(0, 25);
  const statusCode = typeof row["status"] === "number" ? row["status"] : null;
  const hasErrors = consoleErrors.length + pageErrors.length + networkErrors.length > 0;

  return {
    surface: {
      route,
      title: clean(row["title"], 200) || route,
      status: statusCode != null && statusCode >= 400 ? "error" : hasErrors ? "warning" : "healthy",
      screenshotAvailable: Boolean(screenshotDataUrl),
      consoleErrors,
      networkErrors,
      runtimeErrors: pageErrors,
      checkedAt: clean(row["checkedAt"], 80) || null,
    },
    screenshotDataUrl,
  };
}
