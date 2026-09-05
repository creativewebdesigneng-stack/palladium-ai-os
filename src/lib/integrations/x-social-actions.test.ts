import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./oauth.server", () => ({
  getIntegrationAccessToken: vi.fn(),
}));

import { getIntegrationAccessToken } from "./oauth.server";
import {
  X_SOCIAL_ACTION,
  hasNativeXConnection,
  prepareXSocialAction,
} from "./x-social-actions.server";

const token = vi.mocked(getIntegrationAccessToken);

describe("native X social action contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    token.mockResolvedValue("encrypted-store-token");
  });

  it("checks native connection availability without returning token material", async () => {
    await expect(hasNativeXConnection("user-1")).resolves.toBe(true);
    expect(token).toHaveBeenCalledWith("user-1", "x");
    token.mockResolvedValueOnce(null);
    await expect(hasNativeXConnection("user-1")).resolves.toBe(false);
  });

  it("prepares an immutable approval-required medium-risk native X post", async () => {
    const prepared = await prepareXSocialAction({
      userId: "user-1",
      provider: "x",
      action: X_SOCIAL_ACTION,
      actionInput: {
        text: "  Blackstar update  ",
        made_with_ai: true,
        paid_partnership: false,
        ignored: "not persisted",
      },
    });

    expect(prepared).toEqual({
      provider: "x",
      action: "x_text_post",
      description: "Publish an approved text post through the native X API v2.",
      risk: "medium",
      requiresApproval: true,
      input: {
        text: "Blackstar update",
        made_with_ai: true,
        paid_partnership: false,
      },
    });
  });

  it("rejects missing content and unavailable native connections before dispatch", async () => {
    await expect(prepareXSocialAction({
      userId: "user-1",
      provider: "x",
      action: X_SOCIAL_ACTION,
      actionInput: { text: "   " },
    })).rejects.toThrow("X post text is required");

    token.mockResolvedValueOnce(null);
    await expect(prepareXSocialAction({
      userId: "user-1",
      provider: "x",
      action: X_SOCIAL_ACTION,
      actionInput: { text: "Update" },
    })).rejects.toThrow("X is not connected through its native OAuth integration");
  });
});
