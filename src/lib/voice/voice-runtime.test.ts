import { describe, expect, it } from "vitest";
import { shouldRetryTranscriptionModel, transcriptionFailureMessage } from "./voice-runtime.server";

describe("voice transcription fallback", () => {
  it("retries with the compatibility model when the configured model is unavailable", () => {
    expect(shouldRetryTranscriptionModel(404, '{"error":{"message":"model not found"}}')).toBe(true);
    expect(shouldRetryTranscriptionModel(400, '{"error":{"message":"unsupported model"}}')).toBe(true);
    expect(shouldRetryTranscriptionModel(422, 'unknown model')).toBe(true);
  });

  it("does not mask invalid audio as a model-selection problem", () => {
    expect(shouldRetryTranscriptionModel(400, 'invalid file format')).toBe(false);
    expect(shouldRetryTranscriptionModel(415, 'unsupported media type')).toBe(false);
    expect(shouldRetryTranscriptionModel(401, 'unauthorized')).toBe(false);
  });

  it("returns actionable provider errors without leaking response bodies", () => {
    expect(transcriptionFailureMessage(401)).toContain('credentials');
    expect(transcriptionFailureMessage(429)).toContain('rate limited');
    expect(transcriptionFailureMessage(415)).toContain('recorded audio');
    expect(transcriptionFailureMessage(503)).toContain('temporarily unavailable');
  });
});
