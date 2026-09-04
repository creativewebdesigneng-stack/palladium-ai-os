import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./oauth.server", () => ({
  getIntegrationAccessToken: vi.fn(),
}));
vi.mock("./meta-social.server", () => ({
  publishFacebookPagePost: vi.fn(),
}));

import { getIntegrationAccessToken } from "./oauth.server";
import {
  META_SOCIAL_ACTION,
  hasNativeMetaConnection,
  prepareMetaSocialAction,
} from "./meta-social-actions.server";

const token = vi.mocked(getIntegrationAccessToken);

describe("native Meta social action contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    token.mockResolvedValue("encrypted-store-token");
  });

  it("exposes connection availability without returning token material", async () => {
    await expect(hasNativeMetaConnection("user-1")).resolves.toBe(true);
    expect(token).toHaveBeenCalledWith("user-1", "meta");

    token.mockResolvedValueOnce(null);
    await expect(hasNativeMetaConnection("user-1")).resolves.toBe(false);
  });

  it("binds Facebook Page publishing as an approval-required medium-risk action", async () => {
    const prepared = await prepareMetaSocialAction({
      userId: "user-1",
      provider: "facebook",
      action: META_SOCIAL_ACTION,
      actionInput: {
        page_id: "page_123",
        message: "  Launch update  ",
        link: "https://blackstar.example/launch",
        ignored: "not persisted",
      },
    });

    expect(prepared).toEqual({
      provider: "facebook",
      action: "facebook_page_post",
      description: "Publish an approved post to a Facebook Page through Meta's native Graph API.",
      risk: "medium",
      requiresApproval: true,
      input: {
        page_id: "page_123",
        message: "Launch update",
        link: "https://blackstar.example/launch",
      },
    });
  });

  it("rejects insecure links and unavailable native connections before dispatch", async () => {
    await expect(prepareMetaSocialAction({
      userId: "user-1",
      provider: "facebook",
      action: META_SOCIAL_ACTION,
      actionInput: { page_id: "page_123", message: "Update", link: "http://example.com" },
    })).rejects.toThrow("Facebook post links must use HTTPS");

    token.mockResolvedValueOnce(null);
    await expect(prepareMetaSocialAction({
      userId: "user-1",
      provider: "facebook",
      action: META_SOCIAL_ACTION,
      actionInput: { page_id: "page_123", message: "Update" },
    })).rejects.toThrow("Meta is not connected through its native OAuth integration");
  });
});
