export const ASSISTANT_ACTIVITY_EVENT = "palladium:assistant-activity";

export const ASSISTANT_ACTIVITY_STATES = [
  "off",
  "idle",
  "listening",
  "transcribing",
  "thinking",
  "navigating",
  "working",
  "waiting_approval",
  "speaking",
  "error",
] as const;

export type AssistantActivityState = (typeof ASSISTANT_ACTIVITY_STATES)[number];
export type AssistantActivity = {
  state: AssistantActivityState;
  source?: "browser" | "cloud" | "text" | "runtime";
  label?: string;
  detail?: string;
  provider?: string;
  model?: string;
  updatedAt: string;
};

const allowedStates = new Set<string>(ASSISTANT_ACTIVITY_STATES);

export function sanitizeAssistantActivity(input: Partial<AssistantActivity>): AssistantActivity {
  const state = allowedStates.has(String(input.state)) ? input.state as AssistantActivityState : "idle";
  const clean = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : undefined;
  return {
    state,
    ...(input.source ? { source: input.source } : {}),
    ...(clean(input.label, 80) ? { label: clean(input.label, 80) } : {}),
    ...(clean(input.detail, 180) ? { detail: clean(input.detail, 180) } : {}),
    ...(clean(input.provider, 80) ? { provider: clean(input.provider, 80) } : {}),
    ...(clean(input.model, 120) ? { model: clean(input.model, 120) } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export function publishAssistantActivity(input: Partial<AssistantActivity>) {
  const activity = sanitizeAssistantActivity(input);
  if (typeof window === "undefined") return activity;
  (window as any).__PALLADIUM_ASSISTANT_ACTIVITY__ = activity;
  window.dispatchEvent(new CustomEvent(ASSISTANT_ACTIVITY_EVENT, { detail: activity }));
  return activity;
}

export function getAssistantActivitySnapshot(): AssistantActivity {
  if (typeof window !== "undefined") {
    const current = (window as any).__PALLADIUM_ASSISTANT_ACTIVITY__;
    if (current && allowedStates.has(String(current.state))) return current;
  }
  return sanitizeAssistantActivity({ state: "idle", label: "Ready" });
}

export function assistantActivityLabel(state: AssistantActivityState) {
  const labels: Record<AssistantActivityState, string> = {
    off: "Assistant off",
    idle: "Ready",
    listening: "Listening",
    transcribing: "Transcribing",
    thinking: "Thinking",
    navigating: "Navigating",
    working: "Working",
    waiting_approval: "Waiting for approval",
    speaking: "Speaking",
    error: "Needs attention",
  };
  return labels[state];
}
