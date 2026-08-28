import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./fake-supabase";
import {
  browserCredentialAuditMetadata,
  generateTotpCode,
  openBrowserSecret,
  resolveBrowserCredential,
  sealBrowserSecret,
} from "../browser-credentials.server";

const KEY = Buffer.alloc(32, 7).toString("base64");

describe("browser credential vault", () => {
  it("round-trips AES-256-GCM ciphertext without storing plaintext", () => {
    const sealed = sealBrowserSecret("super-secret-password", KEY);
    expect(sealed).not.toContain("super-secret-password");
    expect(openBrowserSecret(sealed, KEY)).toBe("super-secret-password");
    expect(() => openBrowserSecret(sealed, Buffer.alloc(32, 8).toString("base64"))).toThrow();
  });

  it("matches the RFC 6238 SHA1 test vector", () => {
    // RFC 6238 shared secret "12345678901234567890" in base32.
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(generateTotpCode(secret, 59_000, { digits: 8 })).toBe("94287082");
  });

  it("resolves only the owner's credential and binds it to the requested domain", async () => {
    process.env["BROWSER_CREDENTIALS_MASTER_KEY"] = KEY;
    const db = createFakeSupabase({
      browser_credentials: [
        {
          id: "cred-1",
          user_id: "user-1",
          name: "Example login",
          domain: "example.com",
          username_ciphertext: sealBrowserSecret("me@example.com", KEY),
          password_ciphertext: sealBrowserSecret("password-123", KEY),
          totp_secret_ciphertext: sealBrowserSecret("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", KEY),
          totp_identifier: "me@example.com",
        },
      ],
    }) as any;

    const value = await resolveBrowserCredential({
      sb: db,
      userId: "user-1",
      credentialId: "cred-1",
      requestedDomain: "app.example.com",
      nowMs: 59_000,
    });
    expect(value).toMatchObject({
      username: "me@example.com",
      password: "password-123",
      totpCode: "287082",
    });
    expect(browserCredentialAuditMetadata(value)).toEqual({
      credential_id: "cred-1",
      credential_name: "Example login",
      domain: "example.com",
      has_username: true,
      has_password: true,
      has_totp: true,
      totp_identifier: "me@example.com",
    });

    await expect(resolveBrowserCredential({
      sb: db,
      userId: "user-1",
      credentialId: "cred-1",
      requestedDomain: "evil.test",
    })).rejects.toThrow("not valid for the requested domain");
  });
});
