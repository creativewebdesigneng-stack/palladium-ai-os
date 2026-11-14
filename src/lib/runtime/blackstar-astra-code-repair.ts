import {
  buildAstraCodeGenerationPrompt,
  buildAstraCodeRepairPrompt,
} from "./blackstar-astra-native-prompts";

export type AstraCodeArtifact = {
  language: string;
  code: string;
  explanation: string;
};

export type AstraCodeCheck = { ok: true } | { ok: false; errors: string[] };

export type AstraCodeRepairStop = "passed" | "attempt_budget" | "no_code";

export type AstraCodeRepairResult = {
  ok: boolean;
  attempts: number;
  artifact: AstraCodeArtifact | null;
  errors: string[];
  stopped: AstraCodeRepairStop;
};

const HARD_MAX_ATTEMPTS = 4;

const FENCE = /```([A-Za-z0-9_+-]*)[^\n]*\n([\s\S]*?)```/;

/** Extracts the first fenced block. Prose outside the fence is not treated as code. */
export function extractAstraCodeArtifact(text: string): AstraCodeArtifact | null {
  const match = FENCE.exec(text ?? "");
  const code = match?.[2]?.replace(/\s+$/, "") ?? "";
  if (!code.trim()) return null;
  const explanation =
    text
      .slice((match?.index ?? 0) + (match?.[0].length ?? 0))
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().startsWith("explanation:"))
      ?.slice("explanation:".length)
      .trim() ?? "";
  return {
    language: (match?.[1] || "text").toLowerCase(),
    code,
    explanation,
  };
}

/**
 * Bounded generate-and-repair loop. The caller supplies generation and the
 * check. This function never executes the model output.
 */
export async function runAstraCodeRepairLoop(args: {
  task: string;
  model?: string;
  maxAttempts?: number;
  generate: (prompt: string, attempt: number) => Promise<string>;
  check: (artifact: AstraCodeArtifact, attempt: number) => Promise<AstraCodeCheck>;
}): Promise<AstraCodeRepairResult> {
  const attemptsAllowed = Math.min(
    Math.max(Math.round(args.maxAttempts ?? 3), 1),
    HARD_MAX_ATTEMPTS,
  );
  let errors = ["The model returned no fenced code block."];
  let artifact: AstraCodeArtifact | null = null;

  for (let attempt = 1; attempt <= attemptsAllowed; attempt += 1) {
    const prompt =
      attempt === 1 || !artifact
        ? args.model
          ? buildAstraCodeGenerationPrompt(args.task, args.model)
          : buildAstraCodeGenerationPrompt(args.task)
        : buildAstraCodeRepairPrompt({
            task: args.task,
            previousCode: artifact.code,
            errors,
            ...(args.model ? { model: args.model } : {}),
          });
    const text = await args.generate(prompt, attempt);
    const extracted = extractAstraCodeArtifact(text);
    if (!extracted) {
      errors = ["The model returned no fenced code block."];
      artifact = null;
      continue;
    }
    artifact = extracted;
    const check = await args.check(extracted, attempt);
    if (check.ok) {
      return { ok: true, attempts: attempt, artifact, errors: [], stopped: "passed" };
    }
    errors = check.errors
      .map((error) => error.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (!errors.length) errors = ["The check failed without an error message."];
  }

  return {
    ok: false,
    attempts: attemptsAllowed,
    artifact,
    errors,
    stopped: artifact ? "attempt_budget" : "no_code",
  };
}
