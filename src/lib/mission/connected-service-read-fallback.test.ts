import { describe, expect, it } from "vitest";
import { connectedServiceReadFallbackSpec } from "./personal-task-execution.server";

describe("connected-service read fallback", () => {
  it("recognises a bounded read-only GitHub repository listing", () => {
    expect(
      connectedServiceReadFallbackSpec({
        id: "task-1",
        request:
          "Using my connected GitHub account through Nango, list my three most recently updated repositories. This is read-only—do not create, edit or delete anything.",
        required_tools: ["connected_service", "nango_capabilities", "nango_action"],
      }),
    ).toEqual({ provider: "github", action: "repositories_list", limit: 3 });
  });

  it("does not reinterpret a GitHub write request as a repository listing", () => {
    expect(
      connectedServiceReadFallbackSpec({
        id: "task-2",
        request: "Create a GitHub issue in palladium-ai-os.",
        required_tools: ["connected_service", "nango_action"],
      }),
    ).toBeNull();
  });

  it("requires a server-granted connected-service tool", () => {
    expect(
      connectedServiceReadFallbackSpec({
        id: "task-3",
        request: "List my three GitHub repositories.",
        required_tools: ["web_search"],
      }),
    ).toBeNull();
  });
});
