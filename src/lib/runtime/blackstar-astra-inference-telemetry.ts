import type { AstraNativeFailureCode } from "./blackstar-astra-native-errors";
import {
  BLACKSTAR_GTX1080TI_QWEN3_LANE,
  type AstraNativeRuntime,
} from "./blackstar-astra-native-lane";

export type AstraInferenceTelemetry = {
  version: 1;
  at: string;
  lane: typeof BLACKSTAR_GTX1080TI_QWEN3_LANE.id;
  runtime: AstraNativeRuntime;
  requested_model: string;
  served_model: string | null;
  provider: string | null;
  identity_match: boolean;
  health: "healthy" | "degraded" | "unavailable" | "skipped";
  latency_ms: number;
  usage: { input: number; output: number };
  fallback: boolean;
  fallback_from: string | null;
  error_code: AstraNativeFailureCode | null;
  output_clamped: boolean;
  context_clamped: boolean;
  prompt_chars: number;
};

const LIMIT = 50;
const records: AstraInferenceTelemetry[] = [];

export function recordAstraInference(record: AstraInferenceTelemetry): AstraInferenceTelemetry {
  records.push(record);
  if (records.length > LIMIT) records.splice(0, records.length - LIMIT);
  return record;
}

export function recentAstraInferenceTelemetry(): AstraInferenceTelemetry[] {
  return records.map((record) => ({ ...record, usage: { ...record.usage } }));
}

export function clearAstraInferenceTelemetry(): void {
  records.length = 0;
}
