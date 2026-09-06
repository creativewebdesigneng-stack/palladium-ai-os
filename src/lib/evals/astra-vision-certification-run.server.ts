import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { getAstraCertificationBenchmarkCase } from './astra-certification-benchmark-suite'
import { getAstraVisionBenchmarkGroundTruth, renderAstraVisionBenchmarkMedia } from './astra-vision-benchmark-media.server'
import { isTrustedAstraCertificationJudge, judgeMatchesCandidate } from './astra-certification-judge-policy'
import { hashAstraEvaluationSystemPrompt, signAstraEvaluationEvidence } from './astra-evaluation-verifier.server'
import { BLACKSTAR_ASTRA_ENGINE_PROFILE, blackstarAstraModelForTaskClass, isBlackstarAstraVisionConfigured } from '@/lib/runtime/blackstar-astra-engine-profile'
import { runVisionChatPinned } from '@/lib/runtime/model-gateway-vision.server'
import { runChatPinned, type Provider } from '@/lib/runtime/model-gateway.server'

type Db = { from: (table: string) => any }
const db = supabaseAdmin as unknown as Db

type RunInput = {
  userId: string
  orgId?: string | null
  caseId: string
  reference: { provider: Provider; model: string }
  judge: { provider: Provider; model: string }
}

function parseJudge(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw
  const first = fenced.indexOf('[')
  const last = fenced.lastIndexOf(']')
  if (first < 0 || last <= first) throw new Error('The vision judge returned an invalid score format.')
  const parsed = JSON.parse(fenced.slice(first, last + 1)) as Array<Record<string, unknown>>
  if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error('The vision judge must score both candidates.')
  const seen = new Set<number>()
  return parsed.map((entry) => {
    const index = Number(entry['index'])
    const score = Number(entry['score'])
    if (!Number.isInteger(index) || index < 0 || index > 1 || seen.has(index) || !Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('The vision judge returned an invalid candidate score.')
    }
    seen.add(index)
    return {
      index,
      score,
      verdict: typeof entry['verdict'] === 'string' ? entry['verdict'].slice(0, 120) : null,
      reasoning: typeof entry['reasoning'] === 'string' ? entry['reasoning'].slice(0, 2000) : null,
    }
  })
}

export async function runTrustedAstraVisionCertificationCase(input: RunInput) {
  if (input.orgId) {
    const { data, error } = await db.from('organisation_members').select('role').eq('org_id', input.orgId).eq('user_id', input.userId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('You do not have access to this workspace.')
  }
  if (!isBlackstarAstraVisionConfigured()) throw new Error('A dedicated multimodal Astra endpoint and BLACKSTAR_ASTRA_VISION_MODEL are required for vision certification.')
  const benchmarkCase = getAstraCertificationBenchmarkCase('vision', input.caseId)
  if (!benchmarkCase) throw new Error('Unknown Astra vision certification case.')
  if (!['openai', 'groq', 'lovable', 'gemini'].includes(input.reference.provider)) throw new Error('The selected reference provider is not enabled for trusted multimodal evaluation.')
  const model = blackstarAstraModelForTaskClass('vision')
  const candidates = [{ provider: 'compatible', model }, input.reference]
  if (!isTrustedAstraCertificationJudge(input.judge.provider, input.judge.model)) throw new Error('Vision certification requires a server-approved independent judge.')
  if (judgeMatchesCandidate(input.judge, candidates)) throw new Error('Vision certification judge must not also be a candidate model.')

  const media = renderAstraVisionBenchmarkMedia(input.caseId)
  const groundTruth = getAstraVisionBenchmarkGroundTruth(input.caseId)
  const systemPromptHash = hashAstraEvaluationSystemPrompt(null)
  const runMetadata = {
    criteria: [...benchmarkCase.criteria], complianceApplied: false,
    astra_activation: {
      server_verified: false, provenance_version: 3, system_prompt_hash: systemPromptHash,
      task_class: 'vision', provider: 'compatible', model, engine_id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
      media_digest: media.digest, media_type: media.mediaType,
    },
  }
  const { data: run, error: runError } = await db.from('model_eval_runs').insert({
    user_id: input.userId, org_id: input.orgId ?? null, name: benchmarkCase.name, prompt: benchmarkCase.prompt,
    evaluation_mode: 'llm_judge', status: 'running', judge_provider: input.judge.provider, judge_model: input.judge.model, metadata: runMetadata,
  }).select('id').single()
  if (runError) throw new Error(runError.message)

  try {
    const responseRows: any[] = []
    for (const candidate of candidates) {
      const started = Date.now()
      const result = await runVisionChatPinned({ provider: candidate.provider as Provider, model: candidate.model, prompt: benchmarkCase.prompt, media, maxTokens: 1200 })
      const { data: saved, error } = await db.from('model_eval_responses').insert({
        run_id: run.id, provider: result.provider, model: result.model,
        label: candidate.provider === 'compatible' ? 'Blackstar Astra Vision' : 'Reference Vision',
        response_text: result.text, latency_ms: Math.max(0, Date.now() - started), input_tokens: result.usage.input, output_tokens: result.usage.output,
        metadata: { modality: 'vision', media_digest: media.digest },
      }).select('id,provider,model,response_text,latency_ms,input_tokens,output_tokens').single()
      if (error) throw new Error(error.message)
      responseRows.push(saved)
    }

    const anonymized = responseRows.map((response, index) => `RESPONSE ${index}\n${response.response_text}`).join('\n\n---\n\n')
    const judgeResult = await runChatPinned({
      provider: input.judge.provider, model: input.judge.model,
      messages: [
        { role: 'system', content: 'You are an impartial benchmark evaluator. Compare each candidate answer against the supplied server-owned visual ground truth and criteria. Score each answer from 0 to 100. Return ONLY a JSON array with index, score, verdict and reasoning.' },
        { role: 'user', content: `TRUSTED VISION PROMPT\n${benchmarkCase.prompt}\n\nSERVER-OWNED GROUND TRUTH\n${JSON.stringify(groundTruth)}\n\nCRITERIA\n${benchmarkCase.criteria.join('; ')}\n\nCANDIDATE ANSWERS\n${anonymized}` },
      ], maxTokens: 1200,
    })
    const judged = parseJudge(judgeResult.text)
    const scores = judged.map((score) => ({
      run_id: run.id, response_id: responseRows[score.index].id, evaluator_type: 'llm_judge', score: score.score,
      verdict: score.verdict, reasoning: score.reasoning,
      criteria: {
        names: benchmarkCase.criteria,
        judgeProvider: judgeResult.provider,
        judgeModel: judgeResult.model,
        benchmarkGroundTruth: groundTruth,
      },
    }))
    const { error: scoreError } = await db.from('model_eval_scores').insert(scores)
    if (scoreError) throw new Error(scoreError.message)

    const provenanceSignature = signAstraEvaluationEvidence({
      runId: run.id, userId: input.userId, orgId: input.orgId ?? null, taskClass: 'vision', model,
      prompt: benchmarkCase.prompt, systemPromptHash, judgeProvider: judgeResult.provider, judgeModel: judgeResult.model,
      criteria: benchmarkCase.criteria, responses: responseRows, scores,
    })
    const completedMetadata = { ...runMetadata, astra_activation: { ...runMetadata.astra_activation, server_verified: true, provenance_signature: provenanceSignature } }
    const { error: completeError } = await db.from('model_eval_runs').update({
      status: 'completed', completed_at: new Date().toISOString(), judge_provider: judgeResult.provider, judge_model: judgeResult.model, metadata: completedMetadata,
    }).eq('id', run.id)
    if (completeError) throw new Error(completeError.message)
    return { runId: run.id }
  } catch (error) {
    await db.from('model_eval_runs').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', run.id)
    throw error
  }
}
