import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { getVoiceRuntimeCapabilities, synthesizeOpenAiSpeech, transcribeOpenAiSpeech } from "@/lib/voice/voice-runtime.server";

type Sb = { from: (table: string) => any };
const audioMime = z.enum(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/aac", "audio/flac"]);

export const getVoiceStudioOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: jobs, error } = await sb.from("voice_studio_jobs")
      .select("id,kind,provider,model,voice,status,input_text,output_text,input_mime_type,output_format,duration_ms,metadata,created_at,completed_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { capabilities: getVoiceRuntimeCapabilities(), jobs: jobs ?? [] };
  });

export const synthesizeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    provider: z.literal("openai").default("openai"),
    text: z.string().trim().min(1).max(4096),
    model: z.string().trim().min(1).max(160).optional(),
    voice: z.string().trim().min(1).max(160).default("alloy"),
    instructions: z.string().trim().max(2000).nullish(),
    format: z.enum(["mp3", "opus", "aac", "flac", "wav", "pcm"]).default("mp3"),
    speed: z.number().min(0.25).max(4).default(1),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const started = Date.now();
    const { data: job, error: jobError } = await sb.from("voice_studio_jobs").insert({
      user_id: context.userId,
      kind: "tts",
      provider: data.provider,
      model: data.model ?? process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
      voice: data.voice,
      status: "running",
      input_text: data.text,
      output_format: data.format,
      metadata: { speed: data.speed, instructions: data.instructions ?? null },
    }).select("id").single();
    if (jobError) throw new Error(jobError.message);
    try {
      const generated = await synthesizeOpenAiSpeech(data);
      const durationMs = Date.now() - started;
      const { error } = await sb.from("voice_studio_jobs").update({ status: "completed", duration_ms: durationMs, completed_at: new Date().toISOString(), metadata: { speed: data.speed, instructions: data.instructions ?? null, bytes: generated.bytes, contentType: generated.contentType } }).eq("id", job.id);
      if (error) throw new Error(error.message);
      await writeAudit({ userId: context.userId, orgId: null, action: "voice_tts_completed", targetType: "voice_studio_job", targetId: job.id, metadata: { provider: data.provider, model: generated.model, voice: data.voice, bytes: generated.bytes } });
      return { jobId: job.id, audioBase64: generated.base64, contentType: generated.contentType, format: data.format, model: generated.model, durationMs };
    } catch (error) {
      await sb.from("voice_studio_jobs").update({ status: "failed", duration_ms: Date.now() - started, completed_at: new Date().toISOString(), metadata: { error: error instanceof Error ? error.message : "Speech generation failed" } }).eq("id", job.id);
      throw error;
    }
  });

export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    provider: z.literal("openai").default("openai"),
    audioBase64: z.string().min(1).max(45_000_000),
    filename: z.string().trim().min(1).max(240),
    mimeType: audioMime,
    model: z.string().trim().min(1).max(160).optional(),
    language: z.string().trim().min(2).max(20).nullish(),
    prompt: z.string().trim().max(2000).nullish(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const started = Date.now();
    const model = data.model ?? process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe";
    const { data: job, error: jobError } = await sb.from("voice_studio_jobs").insert({
      user_id: context.userId,
      kind: "stt",
      provider: data.provider,
      model,
      status: "running",
      input_mime_type: data.mimeType,
      metadata: { filename: data.filename, language: data.language ?? null },
    }).select("id").single();
    if (jobError) throw new Error(jobError.message);
    try {
      const result = await transcribeOpenAiSpeech({ base64: data.audioBase64, filename: data.filename, mimeType: data.mimeType, model: data.model, language: data.language, prompt: data.prompt });
      const durationMs = Date.now() - started;
      const { error } = await sb.from("voice_studio_jobs").update({ status: "completed", output_text: result.text, duration_ms: durationMs, completed_at: new Date().toISOString() }).eq("id", job.id);
      if (error) throw new Error(error.message);
      await writeAudit({ userId: context.userId, orgId: null, action: "voice_stt_completed", targetType: "voice_studio_job", targetId: job.id, metadata: { provider: data.provider, model: result.model } });
      return { jobId: job.id, text: result.text, model: result.model, durationMs };
    } catch (error) {
      await sb.from("voice_studio_jobs").update({ status: "failed", duration_ms: Date.now() - started, completed_at: new Date().toISOString(), metadata: { filename: data.filename, error: error instanceof Error ? error.message : "Transcription failed" } }).eq("id", job.id);
      throw error;
    }
  });
