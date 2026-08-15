import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGitHubAppJwt,
  createGitHubInstallationToken,
  listGitHubCommits,
  listGitHubPath,
  normaliseInstallationId,
  readGitHubFile,
} from "./github-app.server";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GitHub App read-only executor", () => {
  beforeEach(() => {
    process.env["GITHUB_APP_ID"] = "123456";
    process.env["GITHUB_APP_PRIVATE_KEY"] = privateKeyPem;
  });

  afterEach(() => {
    delete process.env["GITHUB_APP_ID"];
    delete process.env["GITHUB_APP_PRIVATE_KEY"];
    vi.restoreAllMocks();
  });

  it("creates a short-lived RS256 app JWT", () => {
    const now = 1_800_000_000;
    const token = createGitHubAppJwt(now);
    const [header, payload, signature] = token.split(".");
    expect(signature).toBeTruthy();
    expect(JSON.parse(Buffer.from(header!, "base64url").toString("utf8"))).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"))).toEqual({
      iat: now - 30,
      exp: now + 8 * 60,
      iss: "123456",
    });
  });

  it("rejects spoof-shaped installation ids before any GitHub request", () => {
    expect(() => normaliseInstallationId("1/../../admin")).toThrow("Invalid GitHub App installation id");
    expect(() => normaliseInstallationId(-1)).toThrow("Invalid GitHub App installation id");
    expect(() => normaliseInstallationId(42)).not.toThrow();
  });

  it("verifies the installation and mints only read-only repository permissions", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 42,
        account: { login: "acme" },
        repository_selection: "selected",
        permissions: { contents: "read", metadata: "read" },
        suspended_at: null,
      }))
      .mockResolvedValueOnce(jsonResponse({ token: "ghs_test", expires_at: "2026-08-15T16:00:00Z" }));

    const result = await createGitHubInstallationToken(42, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ token: "ghs_test", expiresAt: "2026-08-15T16:00:00Z" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const [mintUrl, mintInit] = fetchImpl.mock.calls[1]!;
    expect(String(mintUrl)).toContain("/app/installations/42/access_tokens");
    expect(mintInit.method).toBe("POST");
    expect(JSON.parse(String(mintInit.body))).toEqual({
      permissions: { contents: "read", metadata: "read" },
    });
  });

  it("lists commits through an installation token without exposing credentials in results", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 42,
        permissions: { contents: "read" },
        suspended_at: null,
      }))
      .mockResolvedValueOnce(jsonResponse({ token: "ghs_secret", expires_at: "2026-08-15T16:00:00Z" }))
      .mockResolvedValueOnce(jsonResponse([
        {
          sha: "abc123",
          html_url: "https://github.com/acme/app/commit/abc123",
          commit: {
            message: "Fix billing",
            author: { name: "Dev", date: "2026-08-15T12:00:00Z" },
          },
        },
      ]));

    const commits = await listGitHubCommits({
      installationId: 42,
      owner: "acme",
      repo: "app",
      ref: "main",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(commits).toEqual([
      {
        sha: "abc123",
        message: "Fix billing",
        authorName: "Dev",
        authorDate: "2026-08-15T12:00:00Z",
        htmlUrl: "https://github.com/acme/app/commit/abc123",
      },
    ]);
    expect(JSON.stringify(commits)).not.toContain("ghs_secret");
    const [url] = fetchImpl.mock.calls[2]!;
    expect(String(url)).toContain("/repos/acme/app/commits");
    expect(String(url)).toContain("sha=main");
  });

  it("rejects repository path traversal before minting a token", async () => {
    const fetchImpl = vi.fn();
    await expect(listGitHubPath({
      installationId: 42,
      owner: "acme",
      repo: "app",
      path: "../../secrets",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow("Invalid repository path");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("decodes bounded file content and rejects oversized files", async () => {
    const smallFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 42, permissions: { contents: "read" }, suspended_at: null }))
      .mockResolvedValueOnce(jsonResponse({ token: "ghs_secret", expires_at: "2026-08-15T16:00:00Z" }))
      .mockResolvedValueOnce(jsonResponse({
        type: "file",
        path: "src/index.ts",
        sha: "deadbeef",
        size: 18,
        encoding: "base64",
        content: Buffer.from("export const x = 1;").toString("base64"),
      }));

    await expect(readGitHubFile({
      installationId: 42,
      owner: "acme",
      repo: "app",
      path: "src/index.ts",
      fetchImpl: smallFetch as unknown as typeof fetch,
    })).resolves.toEqual(expect.objectContaining({
      path: "src/index.ts",
      content: "export const x = 1;",
      encoding: "utf-8",
    }));

    const largeFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 42, permissions: { contents: "read" }, suspended_at: null }))
      .mockResolvedValueOnce(jsonResponse({ token: "ghs_secret", expires_at: "2026-08-15T16:00:00Z" }))
      .mockResolvedValueOnce(jsonResponse({
        type: "file",
        path: "huge.bin",
        sha: "beef",
        size: 512_001,
        encoding: "base64",
        content: "AA==",
      }));

    await expect(readGitHubFile({
      installationId: 42,
      owner: "acme",
      repo: "app",
      path: "huge.bin",
      fetchImpl: largeFetch as unknown as typeof fetch,
    })).rejects.toThrow("512000-byte read limit");
  });
});
