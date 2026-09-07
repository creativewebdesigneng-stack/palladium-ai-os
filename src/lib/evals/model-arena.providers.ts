import { z } from "zod";

export const MODEL_ARENA_CANDIDATE_PROVIDERS = [
  "openai",
  "anthropic",
  "groq",
  "deepseek",
  "lovable",
  "compatible",
] as const;

export const MODEL_ARENA_JUDGE_PROVIDERS = [
  ...MODEL_ARENA_CANDIDATE_PROVIDERS,
  "freellm",
] as const;

export const modelArenaCandidateProviderSchema = z.enum(MODEL_ARENA_CANDIDATE_PROVIDERS);
export const modelArenaJudgeProviderSchema = z.enum(MODEL_ARENA_JUDGE_PROVIDERS);

export type ModelArenaCandidateProvider = z.infer<typeof modelArenaCandidateProviderSchema>;
export type ModelArenaJudgeProvider = z.infer<typeof modelArenaJudgeProviderSchema>;
