import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = { from: (table: string) => any };

export const getArenaPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from("model_eval_policies")
      .select("id,name,enabled,redact_email,redact_phone,redact_secrets,blocked_terms,apply_to_requests,apply_to_responses,created_at,updated_at")
      .eq("user_id", context.userId)
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const saveArenaPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120).default("Default evaluation compliance"),
    enabled: z.boolean().default(true),
    redactEmail: z.boolean().default(true),
    redactPhone: z.boolean().default(true),
    redactSecrets: z.boolean().default(true),
    blockedTerms: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
    applyToRequests: z.boolean().default(true),
    applyToResponses: z.boolean().default(true),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = { user_id: context.userId, name: data.name, enabled: data.enabled, redact_email: data.redactEmail, redact_phone: data.redactPhone, redact_secrets: data.redactSecrets, blocked_terms: data.blockedTerms, apply_to_requests: data.applyToRequests, apply_to_responses: data.applyToResponses };
    const query = data.id ? sb.from("model_eval_policies").update(row).eq("id", data.id).eq("user_id", context.userId) : sb.from("model_eval_policies").insert(row);
    const { data: saved, error } = await query.select("id,name,enabled,redact_email,redact_phone,redact_secrets,blocked_terms,apply_to_requests,apply_to_responses,created_at,updated_at").single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: "model_eval_policy_saved", targetType: "model_eval_policy", targetId: saved.id });
    return saved;
  });

export const recommendArenaRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ minimumRuns: z.number().int().min(1).max(100).default(2) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: runs, error: runError } = await sb.from("model_eval_runs").select("id").eq("user_id", context.userId).eq("status", "completed").order("created_at", { ascending: false }).limit(100);
    if (runError) throw new Error(runError.message);
    const runIds = (runs ?? []).map((run: any) => run.id);
    if (!runIds.length) return { recommendation: null, candidates: [] };
    const { data: responses, error: responseError } = await sb.from("model_eval_responses").select("id,run_id,provider,model").in("run_id", runIds);
    if (responseError) throw new Error(responseError.message);
    const { data: scores, error: scoreError } = await sb.from("model_eval_scores").select("response_id,score").in("run_id", runIds).eq("evaluator_type", "llm_judge");
    if (scoreError) throw new Error(scoreError.message);
    const scoreByResponse = new Map<string, number>((scores ?? []).map((score: any): [string, number] => [String(score.response_id), Number(score.score)]));
    const buckets = new Map<string, { provider: string; model: string; total: number; runs: number }>();
    for (const response of responses ?? []) {
      const score = scoreByResponse.get(String(response.id));
      if (score == null) continue;
      const key = `${response.provider}\u0000${response.model}`;
      const current = buckets.get(key) ?? { provider: response.provider, model: response.model, total: 0, runs: 0 };
      current.total += score;
      current.runs += 1;
      buckets.set(key, current);
    }
    const candidates = [...buckets.values()].map((item) => ({ provider: item.provider, model: item.model, averageScore: Math.round((item.total / item.runs) * 100) / 100, runs: item.runs })).filter((item) => item.runs >= data.minimumRuns).sort((a, b) => b.averageScore - a.averageScore || b.runs - a.runs);
    return { recommendation: candidates[0] ?? null, candidates };
  });

export const exportArenaDistillation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ minimumScore: z.number().min(0).max(100).default(80), limit: z.number().int().min(1).max(1000).default(500) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: runs, error: runError } = await sb.from("model_eval_runs").select("id,prompt").eq("user_id", context.userId).eq("status", "completed").order("created_at", { ascending: false }).limit(data.limit);
    if (runError) throw new Error(runError.message);
    const runIds = (runs ?? []).map((run: any) => run.id);
    if (!runIds.length) return { filename: "palladium-arena-distillation.jsonl", jsonl: "", examples: 0 };
    const promptByRun = new Map<string, string>((runs ?? []).map((run: any): [string, string] => [String(run.id), String(run.prompt)]));
    const { data: responses, error: responseError } = await sb.from("model_eval_responses").select("id,run_id,provider,model,response_text").in("run_id", runIds);
    if (responseError) throw new Error(responseError.message);
    const { data: scores, error: scoreError } = await sb.from("model_eval_scores").select("response_id,score,verdict").in("run_id", runIds).eq("evaluator_type", "llm_judge").gte("score", data.minimumScore);
    if (scoreError) throw new Error(scoreError.message);
    const responseById = new Map<string, any>((responses ?? []).map((response: any): [string, any] => [String(response.id), response]));
    const lines: string[] = [];
    for (const score of scores ?? []) {
      const response = responseById.get(String(score.response_id));
      if (!response) continue;
      const prompt = promptByRun.get(String(response.run_id));
      if (!prompt) continue;
      lines.push(JSON.stringify({ messages: [{ role: "user", content: prompt }, { role: "assistant", content: response.response_text }], metadata: { provider: response.provider, model: response.model, arenaScore: Number(score.score), verdict: score.verdict ?? null } }));
      if (lines.length >= data.limit) break;
    }
    await writeAudit({ userId: context.userId, orgId: null, action: "model_eval_distillation_exported", targetType: "model_eval_run", targetId: context.userId, metadata: { examples: lines.length, minimumScore: data.minimumScore } });
    return { filename: "palladium-arena-distillation.jsonl", jsonl: lines.join("\n"), examples: lines.length };
  });
