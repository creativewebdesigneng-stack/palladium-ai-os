import { describe, expect, it } from "vitest";
import {
  findNangoProvider,
  findNangoProviderByExternalId,
  nangoExternalProviderId,
} from "../nango-providers";

describe("verified Nango provider aliases", () => {
  it("registers the first executable connector wave", () => {
    for (const id of ["airtable", "dropbox", "webflow", "canva", "supabase", "sharepoint"]) {
      expect(findNangoProvider(id), id).toBeDefined();
    }
  });

  it("maps SharePoint's Blackstar identity to Nango SharePoint Online", () => {
    expect(nangoExternalProviderId("sharepoint")).toBe("sharepoint-online");
    expect(findNangoProviderByExternalId("sharepoint-online")?.id).toBe("sharepoint");
  });

  it("keeps same-id providers stable", () => {
    for (const id of ["airtable", "dropbox", "webflow", "canva", "supabase"]) {
      expect(nangoExternalProviderId(id), id).toBe(id);
      expect(findNangoProviderByExternalId(id)?.id, id).toBe(id);
    }
  });
});
