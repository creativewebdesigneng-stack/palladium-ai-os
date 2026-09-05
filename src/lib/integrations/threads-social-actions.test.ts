import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./oauth.server", () => ({
  getIntegrationAccessToken: vi.fn(),
}));

import { getIntegrationAccessToken } from "./oauth.server";
import {
  THREADS_SOCIAL_ACTION,
  hasNativeThreadsConnection,
  prepareThreadsSocialAction,
} from "./threads-social-actions.server";

const token = vi.mocked(getIntegrationAccessToken);

describe("native Threads social action contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    token.mockResolvedValue("threads-token");
  });

  it("exposes native connection availability without returning token material", async () => {
    await expect(hasNativeThreadsConnection("user-1")).resolves.toBe(true);
    expect(token).toHaveBeenCalledWith("user-1", "threads");
    token.mockResolvedValueOnce(null);
    await expect(hasNativeThreadsConnection("user-1")).resolves.toBe(false);
  });

  it("binds text publishing as a medium-risk approval-required action", async () => {
    const prepared = await prepareThreadsSocialAction({
      userId: "user-1",
      provider: "threads",
      action: THREADS_SOCIAL_ACTION,
      actionInput: { text: "  Blackstar update  ", ignored: "not persisted" },
    });

    expect(prepared).toEqual({
      provider: "threads",
      action: "threads_text_post",
      description: "Publish an approved text post through Meta's native Threads API.",
      risk: "medium",
      requiresApproval: true,
      input: { text: "Blackstar update" },
    });
  });

  it("rejects missing content and unavailable native connections", async () => {
    await expect(prepareThreadsSocialAction({
      userId: "user-1",
      provider: "threads",
      action: THREADS_SOCIAL_ACTION,
      actionInput: { text: "   " },
    })).rejects.toThrow("Threads post text is required");

    token.mockResolvedValueOnce(null);
    await expect(prepareThreadsSocialAction({
      userId: "user-1",
      provider: "threads",
      action: THREADS_SOCIAL_ACTION,
      actionInput: { text: "Update" },
    })).rejects.toThrow("Threads is not connected through its native OAuth integration");
  });
});
