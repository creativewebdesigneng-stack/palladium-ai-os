import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { runChat, type Provider } from "@/lib/runtime/model-gateway.server";

type Sb = { from: (table: string) => any };

const providerSchema = z.enum(["openai", "anthropic", "groq", "deepseek", "lovable", "compatible"]);
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

function parseJudgeJson(raw: string): Array<{ index: number; score: number; verdict?: string; reasoning?: string }> {
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
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.orgId) await requireOrgMember(sb, data.orgId, context.userId);
    const { data: run, error: runError } = await sb.from("model_eval_runs").insert({
      user_id: context.userId,
      org_id: data.orgId ?? null,
      name: data.name,
      prompt: data.prompt,
      evaluation_mode: "llm_judge",
      status: "running",
      judge_provider: data.judge.provider,
      judge_model: data.judge.model,
      metadata: { criteria: data.criteria ?? ["correctness", "helpfulness", "clarity"] },
    }).select("id,name").single();
    if (runError) throw new Error(runError.message);

    try {
      const responseRows = [];
      for (const contestant of data.contestants) {
        const started = Date.now();
        const result = await runChat({
          provider: contestant.provider as Provider,
          model: contestant.model,
          messages: [
            ...(data.systemPrompt ? [{ role: "system" as const, content: data.systemPrompt }] : []),
            { role: "user", content: data.prompt },
          ],
          maxTokens: 1600,
        });
        const row = {
          run_id: run.id,
          provider: result.provider,
          model: result.model,
          label: contestant.label ?? `${contestant.provider}/${contestant.model}`,
          response_text: result.text,
          latency_ms: Math.max(0, Date.now() - started),
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
          metadata: {},
        };
        const { data: saved, error } = await sb.from("model_eval_responses").insert(row)
          .select("id,provider,model,label,response_text,latency_ms,input_tokens,output_tokens").single();
        if (error) throw new Error(error.message);
        responseRows.push(saved);
      }

      const criteria = data.criteria ?? ["correctness", "helpfulness", "clarity"];
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
            content: `PROMPT\n${data.prompt}\n\nCRITERIA\n${criteria.join("; ")}\n\nCANDIDATES\n${anonymized}`,
          },
        ],
        maxTokens: 1400,
      });
      const judged = parseJudgeJson(judgeResult.text);
      const scores = judged
        .filter((score) => score.index < responseRows.length)
        .map((score) => ({
          run_id: run.id,
          response_id: responseRows[score.index].id,
          evaluator_type: "llm_judge",
          score: score.score,
          verdict: score.verdict ?? null,
          reasoning: score.reasoning ?? null,
          criteria: { names: criteria, judgeProvider: judgeResult.provider, judgeModel: judgeResult.model },
        }));
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
        metadata: { contestants: data.contestants.length, judgeProvider: judgeResult.provider, judgeModel: judgeResult.model },
      });
      return { runId: run.id, responses: responseRows, scores };
    } catch (error) {
      await sb.from("model_eval_runs").update({ status: "failed", completed_at: new Date().toISOString(), metadata: { failure: error instanceof Error ? error.message : "Evaluation failed" } }).eq("id", run.id);
      await writeAudit({ userId: context.userId, orgId: data.orgId ?? null, action: "model_eval.failed", targetType: "model_eval_run", targetId: run.id, status: "failed" });
      throw error;
    }
  });
