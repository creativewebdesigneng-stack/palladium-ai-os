import { describe, expect, it } from "vitest";
import {
  normalizeOperationalProbe,
  operationalProbeLabel,
} from "../acceptance-preflight";

describe("operational acceptance readiness preflight", () => {
  it("keeps live worker health distinct from output certification", () => {
    const result = normalizeOperationalProbe("cinema", {
      name: "Cinema Master Worker",
      provider: "blackstar-hosted-master",
      configured: true,
      reachable: true,
      healthy: true,
      readySignal: true,
      httpStatus: 200,
      latencyMs: 18.9,
      checkedAt: "2026-10-03T20:00:00.000Z",
      capabilities: { finalOutputCertified: true },
    });

    expect(result).toEqual({
      kind: "cinema",
      name: "Cinema Master Worker",
      provider: "blackstar-hosted-master",
      configured: true,
      reachable: true,
      healthy: true,
      readySignal: true,
      httpStatus: 200,
      latencyMs: 18,
      checkedAt: "2026-10-03T20:00:00.000Z",
      error: null,
    });
    expect("finalOutputCertified" in result).toBe(false);
    expect(operationalProbeLabel(result)).toBe("Ready");
  });

  it("fails closed for malformed or missing readiness signals", () => {
    const result = normalizeOperationalProbe("three-d", {
      provider: 123,
      configured: "yes",
      reachable: 1,
      healthy: "true",
      readySignal: "true",
      httpStatus: 999,
      latencyMs: -5,
      checkedAt: "not-a-date",
      error: "worker unavailable",
    });

    expect(result).toMatchObject({
      kind: "three-d",
      name: "3D Studio worker",
      provider: "unknown",
      configured: false,
      reachable: false,
      healthy: false,
      readySignal: null,
      httpStatus: null,
      latencyMs: null,
      checkedAt: null,
      error: "worker unavailable",
    });
    expect(operationalProbeLabel(result)).toBe("Not configured");
  });

  it("reports reachable but unhealthy workers as attention, not ready", () => {
    const result = normalizeOperationalProbe("cinema", {
      configured: true,
      reachable: true,
      healthy: false,
      readySignal: false,
      httpStatus: 503,
      latencyMs: 40,
    });

    expect(operationalProbeLabel(result)).toBe("Needs attention");
  });
});
