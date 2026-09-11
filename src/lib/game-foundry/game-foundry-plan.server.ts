import { z } from "zod";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";

const gameDesignSchema = z.object({
  concept: z.string().trim().min(20).max(3000),
  coreLoop: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  playerExperience: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  gameplaySystems: z.array(z.string().trim().min(1).max(700)).min(1).max(24),
  worldAndLevels: z.array(z.string().trim().min(1).max(700)).max(24),
  charactersAndAI: z.array(z.string().trim().min(1).max(700)).max(24),
  assetPlan: z.array(z.string().trim().min(1).max(700)).max(30),
  technicalPlan: z.array(z.string().trim().min(1).max(700)).min(1).max(24),
  engineSetup: z.array(z.string().trim().min(1).max(700)).min(1).max(20),
  milestones: z.array(z.string().trim().min(1).max(700)).min(1).max(20),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).min(1).max(24),
});

export type GameFoundryDesign = z.infer<typeof gameDesignSchema> & {
  generatedBy: { provider: Provider; model: string };
};

const SYSTEM_PROMPT = [
  "You are Blackstar Game Foundry's game-design and technical-planning engine.",
  "Create a practical build specification for a real game project.",
  "Do not claim that assets, scenes, scripts, plugins, repositories or builds already exist.",
  "Respect the requested engine and quality target.",
  "Prefer game-ready production constraints, explicit performance budgets, testable milestones and clear asset requirements.",
  "Return strict JSON only with exactly these keys:",
  "concept, coreLoop, playerExperience, gameplaySystems, worldAndLevels, charactersAndAI, assetPlan, technicalPlan, engineSetup, milestones, acceptanceCriteria.",
  "concept is a string. Every other field is an array of concise strings.",
  "Do not include markdown fences.",
].join(" ");

export function parseGameFoundryDesign(text: string) {
  const unfenced = text.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/i,"").trim();
  let value: unknown;
  try { value = JSON.parse(unfenced); } catch { throw new Error("The AI game planner returned invalid JSON."); }
  const parsed = gameDesignSchema.safeParse(value);
  if (!parsed.success) throw new Error("The AI game planner returned an incomplete design specification.");
  return parsed.data;
}

export async function generateGameFoundryDesign(args: {
  name: string;
  prompt: string;
  projectType: string;
  targetEngine: string;
  qualityProfile: string;
  provider: Provider;
  model: string;
}): Promise<GameFoundryDesign> {
  const messages: ChatMessage[] = [
    { role:"system", content:SYSTEM_PROMPT },
    { role:"user", content:
      `Project name: ${args.name}\nProject type: ${args.projectType}\nTarget engine: ${args.targetEngine}\nQuality target: ${args.qualityProfile}\n\nUser brief:\n${args.prompt}`
    },
  ];
  const result = await runChat({
    provider:args.provider,
    model:args.model,
    messages,
    maxTokens:3200,
    temperature:0.25,
  });
  if (!result.text.trim()) throw new ProviderError("The AI game planner returned an empty response.",502,true);
  return { ...parseGameFoundryDesign(result.text), generatedBy:{provider:result.provider,model:result.model} };
}
