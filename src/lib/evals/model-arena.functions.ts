import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { runChat, type Provider } from "@/lib/runtime/model-gateway.server";

type Sb = { from: (table: string) => any };
type ArenaPolicy = {
  redact_email?: boolean | null;
  redact_phone?: boolean | null;
  redact_secrets?: boolean | null;
  blocked_terms?: unknown;
  apply_to_requests?: boolean | null;
  apply_to_responses?: boolean | null;
};
type ModelEvalResponse = {
  id: string;
  provider: string;
  model: string;
  label: string | null;
  response_text: string;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
};

const providerSchema = z.enum(["openai", "anthropic", "groq", "deepseek", "lovable", "compatible"]);
const taskClassSchema = z.enum(["general", "reasoning", "coding", "tool_use", "vision", "agentic"]);
const contestantSchema = z.object({
  provider: providerSchema,
  model: z.string().trim().min(1).max(160),
  label: z.string().trim().min(1).max(80).optional(),
});

async function requireOrgMember(sb: Sb, orgId: string, userId: string) {
  const { data, error } = await sb.from("organisation_members").select("role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You do not have access to this workspace.");
}

async function loadArenaPolicy(sb: Sb, userId: string): Promise<ArenaPolicy | null> {
  const { data, error } = await sb.from("model_eval_policies")
    .select("redact_email,redact_phone,redact_secrets,blocked_terms,apply_to_requests,apply_to_responses")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

function applyArenaPolicy(text: string, policy: ArenaPolicy | null, direction: "request" | "response") {
  if (!policy) return text;
  const shouldApply = direction === "request" ? policy.apply_to_requests !== false : policy.apply_to_responses !== false;
  if (!shouldApply) return text;

  const blockedTerms = Array.isArray(policy.blocked_terms)
    ? policy.blocked_terms.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const lowered = text.toLowerCase();
  const blocked = blockedTerms.find((term) => lowered.includes(term.toLowerCase()));
  if (blocked) throw new Error(`Arena compliance policy blocked ${direction} content containing a restricted term.`);

  let safe = text;
  if (policy.redact_email !== false) safe = safe.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]");
  if (policy.redact_phone !== false) safe = safe.replace(/(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g, "[REDACTED_PHONE]");
  if (policy.redact_secrets !== false) {
    safe = safe
      .replace(/\bs[kK]-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_SECRET]")
      .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{16,}\b/gi, "Bearer [REDACTED_SECRET]")
      .replace(/\b(api[_-]?key|access[_-]?token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED_SECRET]");
  }
  return safe;
}

function parseJudgeJson(raw: string): Array<{ index: number; score: number; verdict?: string | undefined; reasoning?: string | undefined }> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw;
  const first = fenced.indexOf("[");
  const last = fenced.lastIndexOf("]");
  if (first < 0 || last <= first) throw new Error("The judge returned an invalid score format.");
  const parsed: unknown = JSON.parse(fenced.slice(first, last + 1));
  return z.array(z.object({
    index: z.number().int().min(0),
    score: z.number().min(0).max(100),
    verdict: z.string().max(120).optional(),
    reasoning: z.string().max(2000).optional(),
  })).parse(parsed);
}

export const listModelEvalRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orgId: z.string().uuid().nullish(), limit: z.number().int().min(1).max(100).optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.orgId) await requireOrgMember(sb, data.orgId, context.userId);
    let query = sb.from("model_eval_runs")
      .select("id,user_id,org_id,name,prompt,evaluation_mode,status,judge_provider,judge_model,metadata,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 30);
    query = data.orgId ? query.eq("org_id", data.orgId) : query.is("org_id", null).eq("user_id", context.userId);
    const { data: runs, error } = await query;
    if (error) throw new Error(error.message);
    return { runs: runs ?? [] };
  });

export const getModelEvalRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: run, error } = await sb.from("model_eval_runs")
      .select("id,user_id,org_id,name,prompt,evaluation_mode,status,judge_provider,judge_model,metadata,created_at,completed_at")
      .eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) throw new Error("Evaluation run not found or access denied.");
    const [responses, scores] = await Promise.all([
      sb.from("model_eval_responses").select("id,run_id,provider,model,label,response_text,latency_ms,input_tokens,output_tokens,metadata,created_at").eq("run_id", data.id).order("created_at", { ascending: true }),
      sb.from("model_eval_scores").select("id,run_id,response_id,evaluator_type,score,verdict,reasoning,criteria,created_at").eq("run_id", data.id).order("score", { ascending: false }),
    ]);
    if (responses.error) throw new Error(responses.error.message);
    if (scores.error) throw new Error(scores.error.message);
    return { run, responses: responses.data ?? [], scores: scores.data ?? [] };
  });

export const runModelArena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    orgId: z.string().uuid().nullish(),
    name: z.string().trim().min(1).max(160),
    prompt: z.string().trim().min(1).max(12000),
    systemPrompt: z.string().trim().max(6000).nullish(),
    contestants: z.array(contestantSchema).min(2).max(6),
    judge: contestantSchema,
    criteria: z.array(z.string().trim().min(1).max(200)).min(1).max(12).optional(),
    astraTaskClass: taskClassSchema.nullish(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.orgId) await requireOrgMember(sb, data.orgId, context.userId);
    const policy = await loadArenaPolicy(sb, context.userId);
    const safePrompt = applyArenaPolicy(data.prompt, policy, "request");
    const safeSystemPrompt = data.systemPrompt ? applyArenaPolicy(data.systemPrompt, policy, "request") : null;

    let astraActivation: Record<string, unknown> | null = null;
    if (data.astraTaskClass) {
      const {
        BLACKSTAR_ASTRA_ENGINE_PROFILE,
        blackstarAstraModelForTaskClass,
        isBlackstarAstraEngineConfigured,
      } = await import("@/lib/runtime/blackstar-astra-engine-profile");
      if (!isBlackstarAstraEngineConfigured()) throw new Error("Blackstar Astra serving is not configured on this deployment.");
      const exactModel = blackstarAstraModelForTaskClass(data.astraTaskClass);
      const hasExactAstraCandidate = data.contestants.some((candidate) => candidate.provider === "compatible" && candidate.model.trim() === exactModel);
      if (!hasExactAstraCandidate) throw new Error("Astra evaluation must include the exact configured Astra serving identity.");
      astraActivation = {
        server_verified: true,
        task_class: data.astraTaskClass,
        provider: "compatible",
        model: exactModel,
        engine_id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
      };
    }

    const criteria = data.criteria ?? ["correctness", "helpfulness", "clarity"];
    const runMetadata = {
      criteria,
      complianceApplied: Boolean(policy),
      ...(astraActivation ? { astra_activation: astraActivation } : {}),
    };
    const { data: run, error: runError } = await sb.from("model_eval_runs").insert({
      user_id: context.userId,
      org_id: data.orgId ?? null,
      name: data.name,
      prompt: safePrompt,
      evaluation_mode: "llm_judge",
      status: "running",
      judge_provider: data.judge.provider,
      judge_model: data.judge.model,
      metadata: runMetadata,
    }).select("id,name").single();
    if (runError) throw new Error(runError.message);

    try {
      const responseRows: ModelEvalResponse[] = [];
      for (const contestant of data.contestants) {
        const started = Date.now();
        const result = await runChat({
          provider: contestant.provider as Provider,
          model: contestant.model,
          messages: [
            ...(safeSystemPrompt ? [{ role: "system" as const, content: safeSystemPrompt }] : []),
            { role: "user", content: safePrompt },
          ],
          maxTokens: 1600,
        });
        const safeResponse = applyArenaPolicy(result.text, policy, "response");
        const row = {
          run_id: run.id,
          provider: result.provider,
          model: result.model,
          label: contestant.label ?? `${contestant.provider}/${contestant.model}`,
          response_text: safeResponse,
          latency_ms: Math.max(0, Date.now() - started),
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
          metadata: { complianceApplied: Boolean(policy) },
        };
        const { data: saved, error } = await sb.from("model_eval_responses").insert(row)
          .select("id,provider,model,label,response_text,latency_ms,input_tokens,output_tokens").single();
        if (error) throw new Error(error.message);
        responseRows.push(saved as ModelEvalResponse);
      }

      const anonymized = responseRows.map((response, index) => `RESPONSE ${index}\n${response.response_text}`).join("\n\n---\n\n");
      const judgeResult = await runChat({
        provider: data.judge.provider as Provider,
        model: data.judge.model,
        messages: [
          {
            role: "system",
            content: "You are an impartial model evaluator. Score each response from 0 to 100 against the requested criteria. Do not reward verbosity by itself. Return ONLY a JSON array of objects with index, score, verdict and reasoning.",
          },
          {
            role: "user",
            content: `PROMPT\n${safePrompt}\n\nCRITERIA\n${criteria.join("; ")}\n\nCANDIDATES\n${anonymized}`,
          },
        ],
        maxTokens: 1400,
      });
      const judged = parseJudgeJson(judgeResult.text);
      const scores = judged.map((score) => {
        const response = responseRows[score.index];
        if (!response) throw new Error(`The judge returned an invalid candidate index: ${score.index}.`);
        return {
          run_id: run.id,
          response_id: response.id,
          evaluator_type: "llm_judge",
          score: score.score,
          verdict: score.verdict ?? null,
          reasoning: score.reasoning ?? null,
          criteria: { names: criteria, judgeProvider: judgeResult.provider, judgeModel: judgeResult.model },
        };
      });
      if (scores.length !== responseRows.length) throw new Error("The judge did not score every candidate response.");
      const { error: scoreError } = await sb.from("model_eval_scores").insert(scores);
      if (scoreError) throw new Error(scoreError.message);
      const { error: completeError } = await sb.from("model_eval_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);
      if (completeError) throw new Error(completeError.message);
      await writeAudit({
        userId: context.userId,
        orgId: data.orgId ?? null,
        action: "model_eval.completed",
        targetType: "model_eval_run",
        targetId: run.id,
        status: "success",
        metadata: { contestants: data.contestants.length, judgeProvider: judgeResult.provider, judgeModel: judgeResult.model, complianceApplied: Boolean(policy), astraTaskClass: data.astraTaskClass ?? null },
      });
      return { runId: run.id, responses: responseRows, scores };
    } catch (error) {
      await sb.from("model_eval_runs").update({ status: "failed", completed_at: new Date().toISOString(), metadata: { ...runMetadata, failure: error instanceof Error ? error.message : "Evaluation failed" } }).eq("id", run.id);
      await writeAudit({ userId: context.userId, orgId: data.orgId ?? null, action: "model_eval.failed", targetType: "model_eval_run", targetId: run.id, status: "failed" });
      throw error;
    }
  });