import {
  BLACKSTAR_GTX1080TI_QWEN3_LANE,
  withQwenThinkingDirective,
} from "./blackstar-astra-native-lane";

const BOUNDARY = [
  "You are Blackstar Astra running as the configured local model.",
  "State only what the prompt and supplied evidence support.",
  "Do not claim to be GPT, Claude, Gemini, or another vendor model.",
  "Do not claim that tests, tools, or external actions ran unless their output is included.",
  "Reasoning depth never grants tools, approvals, permissions, identity, or execution authority.",
  "Do not reveal hidden chain-of-thought. Return the requested artifact only.",
].join(" ");

export function astraNativeIdentityLine(
  model: string = BLACKSTAR_GTX1080TI_QWEN3_LANE.model,
): string {
  return `Local model identity: ${model}. Runtime target: Ollama on an 11 GB GTX 1080 Ti, context ${BLACKSTAR_GTX1080TI_QWEN3_LANE.numCtx} tokens.`;
}

export function buildAstraPlanningPrompt(
  task: string,
  effort: "routine" | "deep" = "routine",
): string {
  const directive = effort === "deep" ? "/think" : "/no_think";
  return withQwenThinkingDirective(
    [
      BOUNDARY,
      astraNativeIdentityLine(),
      "Produce a bounded plan as JSON with keys goal, steps, risks, and done_when.",
      "steps is an array of short strings. Keep the plan inside eight steps.",
      "Do not include code execution or tool calls.",
      `Task: ${task.trim()}`,
    ].join("\n"),
    directive,
  );
}

export function buildAstraCodeGenerationPrompt(
  task: string,
  model: string = BLACKSTAR_GTX1080TI_QWEN3_LANE.model,
): string {
  return withQwenThinkingDirective(
    [
      BOUNDARY,
      astraNativeIdentityLine(model),
      'Write the requested code in one fenced block. After the fence, add a single line beginning with "Explanation:".',
      "Prefer a complete, self-contained snippet that a later check can compile or evaluate.",
      "If the task is ambiguous, choose the smallest interpretation and state that assumption in the explanation.",
      `Task: ${task.trim()}`,
    ].join("\n"),
    "/no_think",
  );
}

export function buildAstraCodeRepairPrompt(args: {
  task: string;
  previousCode: string;
  errors: string[];
  model?: string;
}): string {
  const errors = args.errors
    .map((error) => error.trim())
    .filter(Boolean)
    .slice(0, 12);
  return withQwenThinkingDirective(
    [
      BOUNDARY,
      astraNativeIdentityLine(args.model),
      "The previous code failed its check. Return one complete replacement fenced block, not a diff.",
      "Keep behaviour that was not named in the errors. Do not claim the check has already passed.",
      `Task: ${args.task.trim()}`,
      "Previous code:",
      args.previousCode.trim().slice(0, 12000),
      "Check errors:",
      errors.join("\n").slice(0, 4000) || "The check failed without an error message.",
    ].join("\n"),
    "/think",
  );
}
