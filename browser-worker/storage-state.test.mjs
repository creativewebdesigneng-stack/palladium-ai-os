import test from "node:test";
import assert from "node:assert/strict";
import { filterStorageState } from "./storage-state.mjs";

test("storage state keeps only allowed-domain cookies and origins", () => {
  const state = filterStorageState({
    cookies: [
      { name: "session", value: "secret", domain: ".example.com", path: "/", expires: -1, httpOnly: true, secure: true, sameSite: "Lax" },
      { name: "evil", value: "leak", domain: "evil.test", path: "/", expires: -1 },
    ],
    origins: [
      { origin: "https://app.example.com", localStorage: [{ name: "token", value: "private" }] },
      { origin: "https://evil.test", localStorage: [{ name: "token", value: "leak" }] },
    ],
  }, ["example.com"]);

  assert.equal(state.cookies.length, 1);
  assert.equal(state.cookies[0].name, "session");
  assert.equal(state.origins.length, 1);
  assert.equal(state.origins[0].origin, "https://app.example.com");
});

test("storage state rejects oversized persisted data", () => {
  assert.throws(() => filterStorageState({
    cookies: Array.from({ length: 20 }, (_, index) => ({
      name: `cookie-${index}`,
      value: "x".repeat(16_000),
      domain: "example.com",
      path: "/",
      expires: -1,
    })),
  }, ["example.com"]), /256 KB/);
});
