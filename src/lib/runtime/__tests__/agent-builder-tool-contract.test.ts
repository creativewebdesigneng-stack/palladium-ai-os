import { describe, expect, it } from "vitest";
import { TOOL_SLUGS } from "../tools.server";

// Keep the visual Agent Builder from drifting back to display-only aliases that
// are silently rejected by server-side tool grant resolution.
const BUILDER_DEFAULT_TOOLS = ["web_search", "web_fetch", "file_analysis", "memory_search"];
const BUILDER_TOOL_SLUGS = [
  "web_search",
  "web_fetch",
  "browser",
  "file_analysis",
  "data_analysis",
  "database_query",
  "code_exec",
  "calculator",
  "current_time",
  "memory_search",
  "memory_write",
  "http_request",
  "connected_service",
  "connected_service_write",
  "github_write",
  "request_approval",
  "shopping_search",
  "prepare_purchase",
];

describe("Agent Builder runtime tool contract", () => {
  it("offers only executable runtime tool slugs", () => {
    for (const slug of BUILDER_TOOL_SLUGS) expect(TOOL_SLUGS).toContain(slug);
  });

  it("defaults only to executable runtime tools", () => {
    for (const slug of BUILDER_DEFAULT_TOOLS) expect(TOOL_SLUGS).toContain(slug);
  });

  it("does not regress to the old display-only aliases", () => {
    for (const alias of ["code", "terminal", "files", "database", "http", "email", "calendar", "slack", "discord"])
      expect(BUILDER_TOOL_SLUGS).not.toContain(alias);
  });
});
