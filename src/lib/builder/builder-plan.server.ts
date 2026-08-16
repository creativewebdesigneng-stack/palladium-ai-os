import { z } from "zod";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";

const planSchema = z.object({
  summary: z.string().trim().min(20).max(2000),
  architecture: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  features: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  dataModel: z.array(z.string().trim().min(1).max(500)).max(20),
  implementationSteps: z.array(z.string().trim().min(1).max(700)).min(1).max(20),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});

export type BuilderPlan = z.infer<typeof planSchema> & {
  generatedBy: { provider: Provider; model: string };
};

const SYSTEM_PROMPT = [
  "You are PalladiumAI App Builder's planning engine.",
  "Create an implementation plan only; do not claim that files, repositories, databases or deployments already exist.",
  "Return strict JSON and nothing else with exactly these keys:",
  'summary, architecture, features, dataModel, implementationSteps, acceptanceCriteria.',
  "All fields except summary are arrays of concise strings.",
  "Prefer a smallest production-capable architecture, explicit security boundaries and testable acceptance criteria.",
  "Do not include markdown fences.",
].join(" ");

export function parseBuilderPlan(text: string) {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let value: unknown;
  try {
    value = JSON.parse(unfenced);
  } catch {
    throw new Error("The AI planner returned an invalid plan format.");
  }
  const parsed = planSchema.safeParse(value);
  if (!parsed.success) throw new Error("The AI planner returned an incomplete plan.");
  return parsed.data;
}

export async function generateBuilderPlan(args: {
  title: string;
  prompt: string;
  provider: Provider;
  model: string;
}): Promise<BuilderPlan> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `App name: ${args.title}\n\nBuild request:\n${args.prompt}`,
    },
  ];

  const result = await runChat({
    provider: args.provider,
    model: args.model,
    messages,
    maxTokens: 2200,
    temperature: 0.2,
  });
  if (!result.text.trim()) throw new ProviderError("The AI planner returned an empty response.", 502, true);

  return {
    ...parseBuilderPlan(result.text),
    generatedBy: { provider: result.provider, model: result.model },
  };
}
