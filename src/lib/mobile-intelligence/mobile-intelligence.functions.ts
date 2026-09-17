import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { normalizeMobilePlatformReport } from "./platforms";
import { mobilePlatformReportSchema } from "./validation";

type Sb = { from: (table: string) => any };
const deviceIdSchema = z.string().uuid();

export const listMobileIntelligenceDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ includeRevoked: z.boolean().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb.from("mobile_intelligence_devices")
      .select("id,display_name,platform,os_version,native_intelligence_available,native_provider,capabilities,app_actions_available,paired_at,last_seen_at,revoked_at")
      .eq("user_id", context.userId)
      .order("paired_at", { ascending: false });
    if (!data.includeRevoked) query = query.is("revoked_at", null);
    const { data: devices, error } = await query;
    if (error) throw new Error(error.message);
    return devices ?? [];
  });

export const registerMobileIntelligenceDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    displayName: z.string().trim().min(1).max(120),
    report: mobilePlatformReportSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const device = normalizeMobilePlatformReport(data.report);
    const row: Record<string, unknown> = {
      user_id: context.userId,
      display_name: data.displayName,
      platform: device.platform,
      os_version: device.osVersion,
      native_intelligence_available: device.nativeIntelligenceAvailable,
      capabilities: device.capabilities,
      app_actions_available: device.appActionsAvailable,
      last_seen_at: new Date().toISOString(),
    };
    if (device.nativeProvider !== undefined) row.native_provider = device.nativeProvider;
    const { data: created, error } = await sb.from("mobile_intelligence_devices")
      .insert(row)
      .select("id,display_name,platform,paired_at")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      orgId: null,
      action: "mobile_intelligence_device_registered",
      targetType: "mobile_intelligence_device",
      targetId: created.id,
      metadata: { platform: device.platform, nativeIntelligenceAvailable: device.nativeIntelligenceAvailable },
    });
    return created;
  });

export const updateMobileIntelligenceCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ deviceId: deviceIdSchema, report: mobilePlatformReportSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const device = normalizeMobilePlatformReport(data.report);
    const patch: Record<string, unknown> = {
      platform: device.platform,
      os_version: device.osVersion,
      native_intelligence_available: device.nativeIntelligenceAvailable,
      capabilities: device.capabilities,
      app_actions_available: device.appActionsAvailable,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    patch.native_provider = device.nativeProvider ?? null;
    const { data: updated, error } = await sb.from("mobile_intelligence_devices")
      .update(patch)
      .eq("id", data.deviceId)
      .eq("user_id", context.userId)
      .is("revoked_at", null)
      .select("id,last_seen_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Mobile device not found or revoked.");
    return updated;
  });

export const revokeMobileIntelligenceDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ deviceId: deviceIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const revokedAt = new Date().toISOString();
    const { data: revoked, error } = await sb.from("mobile_intelligence_devices")
      .update({ revoked_at: revokedAt, updated_at: revokedAt })
      .eq("id", data.deviceId)
      .eq("user_id", context.userId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!revoked) throw new Error("Mobile device not found or already revoked.");
    await writeAudit({
      userId: context.userId,
      orgId: null,
      action: "mobile_intelligence_device_revoked",
      targetType: "mobile_intelligence_device",
      targetId: data.deviceId,
      metadata: {},
    });
    return { deviceId: data.deviceId, revokedAt };
  });
