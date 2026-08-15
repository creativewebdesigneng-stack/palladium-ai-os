import { describe, expect, it } from "vitest";
import { normaliseSalesforceInstanceUrl } from "./oauth.server";

describe("Salesforce OAuth provider config", () => {
  it("accepts HTTPS Salesforce tenant hosts and reduces them to their origin", () => {
    expect(normaliseSalesforceInstanceUrl("https://acme.my.salesforce.com/services/oauth2/id/abc")).toBe(
      "https://acme.my.salesforce.com",
    );
    expect(normaliseSalesforceInstanceUrl("https://eu45.salesforce.com/")).toBe(
      "https://eu45.salesforce.com",
    );
  });

  it("rejects arbitrary, insecure, credentialed and lookalike hosts", () => {
    for (const value of [
      "http://acme.my.salesforce.com",
      "https://evil.example.com",
      "https://salesforce.com.evil.example",
      "https://user:pass@acme.my.salesforce.com",
      "https://acme.my.salesforce.com:8443",
      "not a url",
    ]) {
      expect(normaliseSalesforceInstanceUrl(value)).toBeNull();
    }
  });
});
