import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const screen = readFileSync("src/screens/AdminOrganisations.jsx", "utf8");
const table = readFileSync("src/components/admin-orgs/OrgsTable.jsx", "utf8");
const detail = readFileSync("src/components/admin-orgs/OrgDetail.jsx", "utf8");
const server = readFileSync("src/lib/admin/admin-organisations.functions.ts", "utf8");

describe("admin organisation live action contract", () => {
  it("uses a real admin-only update endpoint instead of a placeholder action", () => {
    expect(server).toContain("export const updateAdminOrganisation");
    expect(server).toContain("isPlatformAdmin");
    expect(server).toContain('.from("organisations")');
    expect(server).toContain("billing_email");
    expect(screen).toContain("updateAdminOrganisation");
    expect(screen).not.toContain("backend endpoint that is not connected yet");
  });

  it("does not present unsupported destructive organisation actions", () => {
    expect(table).not.toContain("Trash2");
    expect(table).not.toContain("Ban");
    expect(detail).not.toContain("Suspend</button>");
    expect(screen).toContain("Suspension and deletion are intentionally unavailable");
  });
});
