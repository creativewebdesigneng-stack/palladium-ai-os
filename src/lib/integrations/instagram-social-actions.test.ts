import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./oauth.server", () => ({
  getIntegrationAccessToken: vi.fn(),
}));
vi.mock("./instagram-social.server", () => ({
  discoverNativeInstagramAccounts: vi.fn(),
}));

import { getIntegrationAccessToken } from "./oauth.server";
import { discoverNativeInstagramAccounts } from "./instagram-social.server";
import {
  INSTAGRAM_SOCIAL_ACTION,
  hasNativeInstagramConnection,
  prepareInstagramSocialAction,
} from "./instagram-social-actions.server";

const token = vi.mocked(getIntegrationAccessToken);
const accounts = vi.mocked(discoverNativeInstagramAccounts);

describe("native Instagram social action contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    token.mockResolvedValue("encrypted-meta-token");
    accounts.mockResolvedValue([{
      pageId: "page-1",
      pageName: "Blackstar",
      instagramId: "ig-123",
      username: "blackstar",
    }]);
  });

  it("uses the existing Meta connection without returning token material", async () => {
    await expect(hasNativeInstagramConnection("user-1")).resolves.toBe(true);
    expect(token).toHaveBeenCalledWith("user-1", "meta");
  });

  it("prepares an owned Instagram image post as approval-required medium risk", async () => {
    const prepared = await prepareInstagramSocialAction({
      userId: "user-1",
      provider: "instagram",
      action: INSTAGRAM_SOCIAL_ACTION,
      actionInput: {
        instagram_id: "ig-123",
        image_url: "https://cdn.example.com/post.jpg",
        caption: "  Launch update  ",
        alt_text: "  Blackstar launch artwork  ",
        ignored: "not persisted",
      },
    });

    expect(prepared).toEqual({
      provider: "instagram",
      action: "instagram_image_post",
      description: "Publish an approved single-image post to a linked Instagram professional account through Meta's native publishing API.",
      risk: "medium",
      requiresApproval: true,
      input: {
        instagram_id: "ig-123",
        image_url: "https://cdn.example.com/post.jpg",
        caption: "Launch update",
        alt_text: "Blackstar launch artwork",
      },
    });
  });

  it("rejects non-owned accounts and insecure image URLs", async () => {
    await expect(prepareInstagramSocialAction({
      userId: "user-1",
      provider: "instagram",
      action: INSTAGRAM_SOCIAL_ACTION,
      actionInput: {
        instagram_id: "ig-other",
        image_url: "https://cdn.example.com/post.jpg",
        caption: "Update",
      },
    })).rejects.toThrow("not available to this Meta connection");

    await expect(prepareInstagramSocialAction({
      userId: "user-1",
      provider: "instagram",
      action: INSTAGRAM_SOCIAL_ACTION,
      actionInput: {
        instagram_id: "ig-123",
        image_url: "http://cdn.example.com/post.jpg",
        caption: "Update",
      },
    })).rejects.toThrow("must be a clean HTTPS URL");
  });
});
