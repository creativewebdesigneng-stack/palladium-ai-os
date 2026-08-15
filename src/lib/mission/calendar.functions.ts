import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listMissionCalendar } from "./mission.server";

type Sb = { from: (t: string) => any };
type CalendarProvider = "google" | "microsoft";

async function resolveCalendarProvider(
  sb: Sb,
  userId: string,
  requested?: string | null,
): Promise<CalendarProvider> {
  const { data, error } = await sb
    .from("integrations")
    .select("provider,status,connected_at")
    .eq("user_id", userId)
    .in("provider", ["google", "microsoft"])
    .eq("status", "connected")
    .order("connected_at", { ascending: false });
  if (error) throw new Error(error.message);

  const providers = (data ?? [])
    .map((row: any) => row.provider)
    .filter((provider: unknown): provider is CalendarProvider =>
      provider === "google" || provider === "microsoft",
    );

  if ((requested === "google" || requested === "microsoft") && providers.includes(requested)) {
    return requested;
  }
  const provider = providers[0];
  if (!provider) {
    throw new Error("Connect Google Workspace or Microsoft 365 to read your live calendar");
  }
  return provider;
}

export const listConnectedCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      provider?: "google" | "microsoft";
      from?: string | null;
      to?: string | null;
      limit?: number;
    } | undefined) => {
      const limit = Math.min(Math.max(Number(input?.limit ?? 10) || 10, 1), 50);
      const from = input?.from && !Number.isNaN(Date.parse(input.from)) ? input.from : null;
      const to = input?.to && !Number.isNaN(Date.parse(input.to)) ? input.to : null;
      if (from && to && new Date(to).getTime() <= new Date(from).getTime()) {
        throw new Error("Calendar end time must be after the start time");
      }
      return { provider: input?.provider ?? null, from, to, limit };
    },
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const provider = await resolveCalendarProvider(sb, context.userId, data.provider);
    return listMissionCalendar({
      userId: context.userId,
      provider,
      from: data.from,
      to: data.to,
      limit: data.limit,
    });
  });
