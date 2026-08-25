import { describe, expect, it } from "vitest";

import { TOOL_CATALOG } from "../catalog";

describe("Agent Builder provider catalogue", () => {
  it("exposes connected services so a new agent can receive provider assignments", () => {
    expect(TOOL_CATALOG).toContainEqual(
      expect.objectContaining({ id: "connected_service", sensitive: false }),
    );
  });
});
