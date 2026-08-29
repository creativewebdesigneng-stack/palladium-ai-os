import { Buffer } from "node:buffer";

const OPENAI_AUDIO_BASE_URL = (process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/$/, "");

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
      sttDefaultModel: process.env["OPENAI_STT_MODEL"] ?? "gpt-4o-mini-transcribe",
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
  const form = new FormData();
  form.set("file", new Blob([fileBytes], { type: input.mimeType }), input.filename);
  form.set("model", input.model ?? process.env["OPENAI_STT_MODEL"] ?? "gpt-4o-mini-transcribe");
  if (input.language) form.set("language", input.language);
  if (input.prompt) form.set("prompt", input.prompt);
  const response = await fetch(`${OPENAI_AUDIO_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: auth.authorization },
    body: form,
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Transcription failed (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ""}`);
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { parsed = { text: raw }; }
  const text = typeof parsed?.text === "string" ? parsed.text : "";
  if (!text) throw new Error("The transcription provider returned no text.");
  return { text, model: input.model ?? process.env["OPENAI_STT_MODEL"] ?? "gpt-4o-mini-transcribe", raw: parsed };
}

function mimeForFormat(format: string) {
  if (format === "wav" || format === "pcm") return "audio/wav";
  if (format === "opus") return "audio/opus";
  if (format === "aac") return "audio/aac";
  if (format === "flac") return "audio/flac";
  return "audio/mpeg";
}
