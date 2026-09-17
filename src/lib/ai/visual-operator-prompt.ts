import type { BlackstarInspectionSurface } from "./visual-inspection";

export type BlackstarVisualOperatorInput = {
  surface: BlackstarInspectionSurface;
  screenshotDataUrl: string;
};

const MAX_SCREENSHOT_CHARS = 8_000_000;

export function normaliseVisualOperatorInput(input: BlackstarVisualOperatorInput) {
  const screenshot = String(input.screenshotDataUrl || "");
  if (!screenshot.startsWith("data:image/png;base64,") || screenshot.length > MAX_SCREENSHOT_CHARS) {
    throw new Error("Visual Operator requires a bounded PNG screenshot.");
  }
  return { surface: input.surface, screenshotDataUrl: screenshot };
}

export function visualOperatorInstructions(surface: BlackstarInspectionSurface): string {
  const errors = [
    ...(surface.consoleErrors ?? []).map((message) => `console: ${message}`),
    ...(surface.networkErrors ?? []).map((message) => `network: ${message}`),
    ...(surface.runtimeErrors ?? []).map((message) => `runtime: ${message}`),
  ].slice(0, 50);

  return [
    "You are Blackstar Visual Operator. Assess only the supplied rendered Blackstar page and observed QA evidence.",
    `Route: ${surface.route}`,
    `Title: ${surface.title}`,
    `Observed status: ${surface.status}`,
    errors.length ? `Observed errors:\n${errors.join("\n")}` : "Observed errors: none supplied.",
    "Review visual hierarchy, spacing, typography, contrast, responsive layout, consistency, accessibility cues, navigation clarity, density, clipping/overflow, loading/error states, and Blackstar's premium near-black/violet 3D design language.",
    "Separate observed defects from suggestions. Do not claim anything about pages or interactions not present in the screenshot/evidence. Do not recommend bypassing approvals, authentication, permissions, or safety controls.",
    "Return concise findings ordered by severity, then specific implementation suggestions.",
  ].join("\n\n");
}

export function openAiVisionContent(input: BlackstarVisualOperatorInput) {
  const normalised = normaliseVisualOperatorInput(input);
  return [
    { type: "text", text: visualOperatorInstructions(normalised.surface) },
    { type: "image_url", image_url: { url: normalised.screenshotDataUrl, detail: "high" } },
  ] as const;
}
