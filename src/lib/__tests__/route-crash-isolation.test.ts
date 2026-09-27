import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Blackstar route crash isolation", () => {
  const shell = readFileSync(new URL("../../components/palladium/AppShell.jsx", import.meta.url), "utf8");
  const boundary = readFileSync(new URL("../../components/blackstar/BlackstarRouteErrorBoundary.jsx", import.meta.url), "utf8");

  it("wraps routed application content without replacing the persistent shell", () => {
    expect(shell).toContain("BlackstarRouteErrorBoundary");
    expect(shell).toContain("resetKey={pathname}");
    expect(shell).toContain("<PageTransition>{stage}</PageTransition>");
    expect(shell.indexOf("<Sidebar")).toBeLessThan(shell.indexOf("<BlackstarRouteErrorBoundary"));
  });

  it("resets automatically after navigation to a different route", () => {
    expect(boundary).toContain("prevProps.resetKey !== this.props.resetKey");
    expect(boundary).toContain("this.setState({ error: null })");
  });

  it("keeps recovery actions available when a page render fails", () => {
    expect(boundary).toContain("window.location.reload()");
    expect(boundary).toContain("window.location.href = '/dashboard'");
    expect(boundary).toContain("The rest of Blackstar is still running");
  });

  it("records the failed route and component stack without exposing a fake success state", () => {
    expect(boundary).toContain("[blackstar-route] isolated render failure");
    expect(boundary).toContain("route: this.props.resetKey");
    expect(boundary).toContain("componentStack");
    expect(boundary).not.toContain("setTimeout");
  });
});
