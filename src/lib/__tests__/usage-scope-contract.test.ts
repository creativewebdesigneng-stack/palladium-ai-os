import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const dashboard = read("../../screens/Dashboard.jsx");
const workspaceAnalytics = read("../../screens/Analytics.jsx");
const platformAnalytics = read("../../screens/AdminPlatformAnalytics.jsx");
const systemMonitoring = read("../../screens/SystemMonitoring.jsx");

describe("usage metric scope labels", () => {
  it("labels workspace dashboard and analytics figures as workspace-scoped", () => {
    expect(dashboard).toContain("in your workspace");
    expect(workspaceAnalytics).toContain("These figures are not platform-wide totals");
  });

  it("labels admin analytics and monitoring figures as platform-wide", () => {
    expect(platformAnalytics).toContain("Figures are platform-wide");
    expect(platformAnalytics).toContain("not the same as agent task runs in an individual workspace");
    expect(systemMonitoring).toContain("platform-wide signals");
    expect(systemMonitoring).toContain("Platform agent task runs");
  });
});
