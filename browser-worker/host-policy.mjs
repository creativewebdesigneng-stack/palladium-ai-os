/**
 * Host binding policy for Blackstar's single existing Playwright worker.
 * On desktop Windows the safe default is localhost-only; Docker/Render
 * still binds 0.0.0.0 as before to support container networking.
 * Public ingress always requires the existing private bearer token.
 */
export function browserWorkerBindAddress(platform, configured) {
  if (configured !== undefined && configured !== null && String(configured).trim()) {
    const value = String(configured).trim();
    if (!["127.0.0.1", "::1", "0.0.0.0", "::"].includes(value)) {
      throw new Error("Browser worker must bind to a recognised loopback or wildcard address.");
    }
    return value;
  }
  return platform === "win32" ? "127.0.0.1" : "0.0.0.0";
}
