import { describe, expect, it } from "vitest";
import { bootstrapAuthorizationFailure } from "./bootstrap.functions";

const token = "correct-token-value";
const enabled = {
  ADMIN_BOOTSTRAP_ENABLED: "true",
  ADMIN_BOOTSTRAP_TOKEN: token,
};

describe("admin bootstrap authorization", () => {
  it("stays disabled unless the operator flag and a long server token are set", () => {
    expect(bootstrapAuthorizationFailure({}, token)).toBe("Admin bootstrap is disabled.");
    expect(bootstrapAuthorizationFailure({ ADMIN_BOOTSTRAP_ENABLED: "true" }, token)).toBe(
      "Admin bootstrap is disabled.",
    );
    expect(
      bootstrapAuthorizationFailure(
        { ADMIN_BOOTSTRAP_ENABLED: "true", ADMIN_BOOTSTRAP_TOKEN: "too-short" },
        "too-short",
      ),
    ).toBe("Admin bootstrap is disabled.");
  });

  it("rejects a wrong token with the same failure as a disabled bootstrap", () => {
    expect(bootstrapAuthorizationFailure(enabled, "wrong-token-value!!")).toBe(
      bootstrapAuthorizationFailure({ ADMIN_BOOTSTRAP_ENABLED: "false" }, token),
    );
  });

  it("accepts only the configured token", () => {
    expect(bootstrapAuthorizationFailure(enabled, token)).toBeNull();
  });
});
