import { Buffer } from 'node:buffer';

const WORKER_URL = (process.env['LUXTTS_WORKER_URL'] ?? '').replace(/\/$/, '');
const WORKER_TOKEN = process.env['LUXTTS_WORKER_TOKEN'] ?? '';

function headers() {
  return WORKER_TOKEN
    ? { Authorization: `Bearer ${WORKER_TOKEN}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export function getLuxTtsCapabilities() {
  return {
    configured: Boolean(WORKER_URL),
    provider: 'luxtts',
    tts: true,
    voiceCloning: true,
    outputSampleRateHz: 48_000,
    localFirst: true,
    note: 'LuxTTS is delegated to a separately deployed Python/GPU-or-CPU worker. Reference audio is sent only for the explicit generation request and PalladiumAI does not store the source audio bytes.',
  };
}

export async function synthesizeLuxTts(input: {
  text: string;
  referenceAudioBase64: string;
  referenceFilename: string;
  referenceMimeType: string;
  speed: number;
  steps: number;
}) {
  if (!WORKER_URL) throw new Error('LuxTTS worker is not configured on this deployment.');
  const response = await fetch(`${WORKER_URL}/synthesize`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text: input.text,
      reference_audio_base64: input.referenceAudioBase64,
      reference_filename: input.referenceFilename,
      reference_mime_type: input.referenceMimeType,
      speed: input.speed,
      num_steps: input.steps,
      sample_rate_hz: 48_000,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    throw new Error(`LuxTTS worker rejected the request (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ''}`);
  }
  if (contentType.includes('application/json')) {
    const json = await response.json() as Record<string, unknown>;
    const encoded = typeof json['audioBase64'] === 'string'
      ? json['audioBase64']
      : typeof json['audio_base64'] === 'string'
        ? json['audio_base64']
        : null;
    if (!encoded) throw new Error('LuxTTS worker returned no audio.');
    return { base64: encoded, contentType: typeof json['contentType'] === 'string' ? json['contentType'] : 'audio/wav', bytes: Buffer.from(encoded, 'base64').length };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('LuxTTS worker returned empty audio.');
  return { base64: bytes.toString('base64'), contentType: contentType || 'audio/wav', bytes: bytes.length };
}
