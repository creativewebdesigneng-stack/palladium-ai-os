import { describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: createFakeSupabase() }));

import {
  buildConnectedServiceRequest,
  CONNECTED_SERVICE_ACTIONS,
} from "@/lib/integrations/connected-service.server";

describe("connected service read request whitelist", () => {
  it("contains only the intended read-capable providers", () => {
    expect(Object.keys(CONNECTED_SERVICE_ACTIONS).sort()).toEqual(
      ["asana", "github", "google", "hubspot", "linear", "microsoft", "notion", "salesforce", "slack"].sort(),
    );
    expect(CONNECTED_SERVICE_ACTIONS["github"]).toEqual([
      "repositories_list",
      "repository_overview",
      "branches_list",
      "commits_list",
      "path_list",
      "file_read",
    ]);
  });

  it("rejects an unknown provider/action before building a request", () => {
    expect(() =>
      buildConnectedServiceRequest({ provider: "google", action: "gmail_send", query: "hello" }),
    ).toThrow(/not available/);
    expect(() =>
      buildConnectedServiceRequest({ provider: "evil", action: "fetch", query: "https://evil.test" }),
    ).toThrow(/not available/);
  });

  it("uses fixed Google Calendar origin/path", () => {
    const req = buildConnectedServiceRequest({ provider: "google", action: "calendar_upcoming", limit: 5 });
    const url = new URL(req.url);
    expect(url.origin).toBe("https://www.googleapis.com");
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(url.searchParams.get("maxResults")).toBe("5");
  });

  it("keeps hostile Linear search text in variables rather than the query document", () => {
    const hostile = 'x" }) { nodes { id } } mutation Evil { issueDelete(id:"1")';
    const req = buildConnectedServiceRequest({ provider: "linear", action: "issues_search", query: hostile, limit: 3 });
    const body = JSON.parse(req.body ?? "{}");
    expect(body.query).toContain("ConnectedIssues");
    expect(body.query).not.toContain("issueDelete");
    expect(body.variables.query).toBe(hostile.slice(0, 200));
  });

  it("requires provider resource ids for scoped reads", () => {
    expect(() =>
      buildConnectedServiceRequest({ provider: "slack", action: "channel_history" }),
    ).toThrow(/resource_id/);
    expect(() =>
      buildConnectedServiceRequest({ provider: "asana", action: "project_tasks" }),
    ).toThrow(/resource_id/);
  });
});
