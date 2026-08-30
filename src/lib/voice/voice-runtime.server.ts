import { Buffer } from "node:buffer";

const OPENAI_AUDIO_BASE_URL = (process.env["OPENAI_AUDIO_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/$/, "");
const DEFAULT_STT_MODEL = process.env["OPENAI_STT_MODEL"] ?? "gpt-4o-mini-transcribe";

function openAiHeaders() {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("OpenAI audio is not configured on this deployment.");
  return { key, authorization: `Bearer ${key}` };
}

export function getVoiceRuntimeCapabilities() {
  return {
    openai: {
      configured: Boolean(process.env["OPENAI_API_KEY"]),
      tts: true,
      stt: true,
      customVoices: true,
      customVoiceNote: "Custom voice IDs require an eligible OpenAI account and prior consent-backed voice creation.",
      ttsDefaultModel: process.env["OPENAI_TTS_MODEL"] ?? "gpt-4o-mini-tts",
      sttDefaultModel: DEFAULT_STT_MODEL,
      voices: ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse", "marin", "cedar"],
      formats: ["mp3", "opus", "aac", "flac", "wav", "pcm"],
    },
  };
}

export async function synthesizeOpenAiSpeech(input: {
  text: string;
  model?: string;
  voice: string;
  instructions?: string | null;
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
  speed?: number;
}) {
  const auth = openAiHeaders();
  const response = await fetch(`${OPENAI_AUDIO_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: { Authorization: auth.authorization, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model ?? process.env["OPENAI_TTS_MODEL"] ?? "gpt-4o-mini-tts",
      input: input.text,
      voice: input.voice,
      ...(input.instructions ? { instructions: input.instructions } : {}),
      response_format: input.format ?? "mp3",
      speed: input.speed ?? 1,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Speech generation failed (${response.status})${body ? `: ${body.slice(0, 500)}` : ""}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    base64: bytes.toString("base64"),
    contentType: response.headers.get("content-type") ?? mimeForFormat(input.format ?? "mp3"),
    bytes: bytes.length,
    model: input.model ?? process.env["OPENAI_TTS_MODEL"] ?? "gpt-4o-mini-tts",
  };
}

export function shouldRetryTranscriptionModel(status: number, raw: string) {
  if (status === 404) return true;
  if (status !== 400 && status !== 422) return false;
  return /model|unsupported|does not exist|not found|unknown/i.test(raw);
}

export function transcriptionFailureMessage(status: number) {
  if (status === 401 || status === 403) return "Cloud speech credentials were rejected by the transcription provider.";
  if (status === 429) return "Cloud speech transcription is rate limited or out of quota.";
  if (status === 413) return "Cloud speech audio segment was too large.";
  if (status === 400 || status === 415 || status === 422) return "Cloud speech provider rejected the recorded audio segment.";
  if (status >= 500) return "Cloud speech provider is temporarily unavailable.";
  return `Cloud speech transcription failed (${status}).`;
}

function transcriptionModels(inputModel?: string) {
  const primary = inputModel ?? process.env["OPENAI_STT_MODEL"] ?? "gpt-4o-mini-transcribe";
  return Array.from(new Set([primary, "whisper-1"]));
}

async function requestTranscription(input: {
  auth: string;
  fileBytes: ArrayBuffer;
  filename: string;
  mimeType: string;
  model: string;
  language?: string | null | undefined;
  prompt?: string | null | undefined;
}) {
  const form = new FormData();
  form.set("file", new Blob([input.fileBytes], { type: input.mimeType }), input.filename);
  form.set("model", input.model);
  if (input.language) form.set("language", input.language);
  if (input.prompt) form.set("prompt", input.prompt);
  const response = await fetch(`${OPENAI_AUDIO_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: input.auth },
    body: form,
  });
  const raw = await response.text();
  return { response, raw };
}

export async function transcribeOpenAiSpeech(input: {
  base64: string;
  filename: string;
  mimeType: string;
  model?: string;
  language?: string | null;
  prompt?: string | null;
}) {
  const auth = openAiHeaders();
  const fileBytes = Uint8Array.from(Buffer.from(input.base64, "base64")).buffer;
  const models = transcriptionModels(input.model);
  let lastStatus = 500;
  let lastRaw = "";

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]!;
    const { response, raw } = await requestTranscription({
      auth: auth.authorization,
      fileBytes,
      filename: input.filename,
      mimeType: input.mimeType,
      model,
      language: input.language,
      prompt: input.prompt,
    });
    lastStatus = response.status;
    lastRaw = raw;

    if (!response.ok) {
      const hasFallback = index < models.length - 1;
      if (hasFallback && shouldRetryTranscriptionModel(response.status, raw)) continue;
      throw new Error(transcriptionFailureMessage(response.status));
    }

    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { text: raw }; }
    const text = typeof parsed?.text === "string" ? parsed.text.trim() : "";

    // Short ambient chunks frequently contain only silence. Treat that as a
    // normal no-op rather than surfacing a false transcription failure every
    // few seconds while the assistant is simply listening.
    return { text, model, raw: parsed };
  }

  throw new Error(transcriptionFailureMessage(lastStatus || 500) + (lastRaw ? "" : ""));
}

function mimeForFormat(format: string) {
  if (format === "wav" || format === "pcm") return "audio/wav";
  if (format === "opus") return "audio/opus";
  if (format === "aac") return "audio/aac";
  if (format === "flac") return "audio/flac";
  return "audio/mpeg";
}
