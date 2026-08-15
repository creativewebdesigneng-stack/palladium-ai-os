import { describe, expect, it, beforeEach } from "vitest";

import {
  consumePostAuthRedirect,
  storePostAuthRedirect,
  POST_AUTH_REDIRECT_KEY,
} from "@/lib/authReturnTo";
import {
  isSignedIn,
  showGuestAuthControls,
  shouldConsumePostAuthRedirect,
} from "@/lib/authUiState";

// Minimal sessionStorage stub — the helpers only need get/set/remove.
function installSessionStorage() {
  const store = new Map<string, string>();
  const stub = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (globalThis as unknown as { sessionStorage: typeof stub }).sessionStorage = stub;
  return store;
}

describe("post-OAuth session handoff", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installSessionStorage();
  });

  it("parks a same-origin destination before the broker redirect", () => {
    expect(storePostAuthRedirect("/dashboard")).toBe(true);
    expect(store.get(POST_AUTH_REDIRECT_KEY)).toBe("/dashboard");
  });

  it("rejects off-origin or protocol-relative destinations", () => {
    expect(storePostAuthRedirect("//evil.com")).toBe(false);
    expect(storePostAuthRedirect("https://evil.com/x")).toBe(false);
    expect(store.size).toBe(0);
  });

  it("consumes the destination exactly once", () => {
    storePostAuthRedirect("/mission-control");
    expect(consumePostAuthRedirect()).toBe("/mission-control");
    expect(consumePostAuthRedirect()).toBeNull();
  });

  it("returns null when the destination is the landing page", () => {
    storePostAuthRedirect("/");
    expect(consumePostAuthRedirect()).toBeNull();
  });
});

describe("authenticated UI state", () => {
  const guest = { authChecked: true, isAuthenticated: false };
  const signedIn = { authChecked: true, isAuthenticated: true };
  const loading = { authChecked: false, isAuthenticated: false };

  it("treats a hydrated session as signed in", () => {
    expect(isSignedIn(signedIn)).toBe(true);
    expect(isSignedIn(guest)).toBe(false);
    expect(isSignedIn(loading)).toBe(false);
  });

  it("hides guest Sign in / Sign up controls once authenticated", () => {
    expect(showGuestAuthControls(signedIn)).toBe(false);
    expect(showGuestAuthControls(guest)).toBe(true);
  });

  it("redirects only signed-in users landing on a public auth entry point", () => {
    expect(shouldConsumePostAuthRedirect(signedIn, "/")).toBe(true);
    expect(shouldConsumePostAuthRedirect(signedIn, "/login")).toBe(true);
    expect(shouldConsumePostAuthRedirect(signedIn, "/pricing")).toBe(false);
    expect(shouldConsumePostAuthRedirect(guest, "/")).toBe(false);
    expect(shouldConsumePostAuthRedirect(loading, "/")).toBe(false);
  });
});
