import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normaliseAnnouncement } from "../system-settings.functions";

describe("platform announcement settings", () => {
  it("normalises malformed stored data to disabled", () => {
    expect(normaliseAnnouncement(null)).toEqual({ enabled: false, text: "", tone: "info" });
    expect(normaliseAnnouncement({ enabled: true, text: 42, tone: "critical" })).toEqual({ enabled: false, text: "", tone: "info" });
  });

  it("accepts only the typed announcement shape", () => {
    expect(normaliseAnnouncement({ enabled: true, text: "Maintenance tonight", tone: "warning" }))
      .toEqual({ enabled: true, text: "Maintenance tonight", tone: "warning" });
  });

  it("keeps the settings table server-only and the admin screen live", () => {
    const migration = readFileSync("supabase/migrations/20260815222500_platform_settings.sql", "utf8");
    const admin = readFileSync("src/lib/admin/system-settings.functions.ts", "utf8");
    const screen = readFileSync("src/screens/AdminSystemSettings.jsx", "utf8");
    const route = readFileSync("src/routes/_shell/_app/dashboard.tsx", "utf8");
    expect(migration).toContain("enable row level security");
    expect(migration).not.toContain("create policy");
    expect(admin).toContain("isPlatformAdmin");
    expect(admin).toContain('key: "announcement"');
    expect(screen).not.toContain("Not configured yet");
    expect(route).toContain("PlatformAnnouncement");
  });
});
