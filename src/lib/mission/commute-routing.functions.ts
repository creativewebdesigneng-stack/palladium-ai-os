import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeCommuteRoutes, type CommuteRoute } from "./commute-routing.server";

type Sb = { from: (table: string) => any };

type LiveCommuteRich = {
  map: { label: string; summary: string; url: string };
  routes: CommuteRoute[];
  metrics: Array<{ label: string; value: number; display: string }>;
};

function routeRich(commute: Awaited<ReturnType<typeof computeCommuteRoutes>>): LiveCommuteRich | null {
  if (!commute || !commute.routes.length) return null;
  const best = commute.routes[0];
  return {
    map: {
      label: "Open live route in Google Maps",
      summary: `${commute.origin} → ${commute.destination}. ${best?.durationText ?? "Route ready"}${best?.trafficDelayText ? ` (${best.trafficDelayText})` : ""}.`,
      url: commute.mapsUrl,
    },
    routes: commute.routes,
    metrics: commute.routes.slice(0, 3).flatMap((route, index) => {
      const name = index === 0 ? "Best" : `Alternative ${index}`;
      return [
        { label: `${name} ETA`, value: route.durationSeconds / 60, display: route.durationText },
        { label: `${name} distance`, value: route.distanceMeters / 1609.344, display: route.distanceText },
      ];
    }),
  };
}

export const getLiveCommuteRoute = createServerFn({ method: "POST" })
  .inputValidator((input: { taskId: string }) => {
    const taskId = String(input?.taskId ?? "").trim();
    if (!taskId || taskId.length > 128) throw new Error("A valid task id is required");
    return { taskId };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const taskRes = await sb
      .from("personal_tasks")
      .select("id,user_id,request,status,result")
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (taskRes.error) throw new Error(taskRes.error.message);
    const task = taskRes.data;
    if (!task || task.user_id !== userId) throw new Error("Task not found");
    if (task.status !== "completed") return { available: false, reason: "task_not_completed" as const };

    const existingResult = task.result && typeof task.result === "object" && !Array.isArray(task.result)
      ? (task.result as Record<string, unknown>)
      : {};
    const existingRich = existingResult["rich"] && typeof existingResult["rich"] === "object" && !Array.isArray(existingResult["rich"])
      ? (existingResult["rich"] as Record<string, unknown>)
      : {};
    if (Array.isArray(existingRich["routes"]) && existingRich["routes"].length) {
      return { available: true, cached: true, rich: existingRich as unknown as LiveCommuteRich };
    }

    const commute = await computeCommuteRoutes(String(task.request ?? ""));
    const rich = routeRich(commute);
    if (!rich) {
      return {
        available: false,
        reason: (process.env["GOOGLE_MAPS_API_KEY"]?.trim() ? "route_unavailable" : "maps_not_configured") as "route_unavailable" | "maps_not_configured",
      };
    }

    const mergedRich = { ...existingRich, ...rich };
    const update = await sb
      .from("personal_tasks")
      .update({ result: { ...existingResult, rich: mergedRich } })
      .eq("id", task.id)
      .eq("user_id", userId);
    if (update.error) throw new Error(update.error.message);

    return { available: true, cached: false, rich };
  });
