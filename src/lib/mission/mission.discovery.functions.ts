import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { googleShoppingConfigured } from "@/lib/shopping/google-shopping.server";
import { routeRequest, runShoppingResearch } from "./mission.server";

type Sb = { from: (table: string) => any };

type DiscoveryInput = {
  request: string;
  agentId?: string | null;
};

const DEFAULT_DOMAINS = [
  "amazon.co.uk",
  "johnlewis.com",
  "argos.co.uk",
  "currys.co.uk",
  "ikea.com",
  "booking.com",
  "trainline.com",
  "tesco.com",
  "sainsburys.co.uk",
];

async function activity(
  sb: Sb,
  userId: string,
  message: string,
  kind: string,
  extra: Record<string, unknown> = {},
) {
  await sb.from("agent_activities").insert({
    user_id: userId,
    message,
    kind,
    agent_id: (extra["agent_id"] as string | null) ?? null,
    task_id: (extra["task_id"] as string | null) ?? null,
    metadata: (extra["metadata"] as Record<string, unknown>) ?? {},
  });
}

async function audit(
  sb: Sb,
  userId: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  await sb.from("mission_audit_logs").insert({
    user_id: userId,
    action,
    agent_id: (extra["agent_id"] as string | null) ?? null,
    target_type: (extra["target_type"] as string | null) ?? null,
    target_id: (extra["target_id"] as string | null) ?? null,
    status: "success",
    metadata: (extra["metadata"] as Record<string, unknown>) ?? {},
  });
}

function providerDiagnostic(configured: boolean, provider: string, results: number) {
  const googleUsed = provider === "google-shopping";
  if (googleUsed) {
    return {
      googleConfigured: true,
      googleUsed: true,
      fallbackUsed: false,
      provider,
      message: `Google Shopping returned ${results} live product${results === 1 ? "" : "s"} for this search.`,
    };
  }
  if (!configured) {
    return {
      googleConfigured: false,
      googleUsed: false,
      fallbackUsed: true,
      provider,
      message: `Google Shopping is not configured in this runtime, so Live Explorer used ${provider}.`,
    };
  }
  return {
    googleConfigured: true,
    googleUsed: false,
    fallbackUsed: true,
    provider,
    message: `Google Shopping was configured but returned no usable products or failed, so Live Explorer fell back to ${provider}.`,
  };
}

/**
 * Read-only discovery lane used by Mission Control before the normal task
 * executor. It may search and compare live product listings, but it never
 * prepares checkout, creates an approval request, or records a purchase.
 */
export const submitMissionDiscovery = createServerFn({ method: "POST" })
  .inputValidator((input: DiscoveryInput) => {
    if (!input?.request?.trim()) throw new Error("Tell your agent what you need");
    return { request: input.request.trim(), agentId: input.agentId ?? null };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const agentRes = data.agentId
      ? await sb
          .from("personal_agents")
          .select("*")
          .eq("id", data.agentId)
          .eq("user_id", userId)
          .maybeSingle()
      : { data: null, error: null };
    if (agentRes.error) throw new Error(agentRes.error.message);
    const agent = agentRes.data;

    const decision = routeRequest(data.request, agent);
    if (decision.category !== "shopping" || decision.commitmentRequested || decision.requiresApproval) {
      return { handled: false as const, decision };
    }

    const budget = decision.budget ?? agent?.budget_limit ?? null;
    const currency = agent?.currency ?? "GBP";
    const allowedTools = agent?.allowed_tools?.length
      ? agent.allowed_tools.filter((tool: string) => tool !== "checkout")
      : ["web_search", "shopping_search", "browser"];

    const taskRes = await sb
      .from("personal_tasks")
      .insert({
        user_id: userId,
        agent_id: agent?.id ?? null,
        title: decision.title,
        request: data.request,
        category: "shopping",
        status: "running",
        priority: decision.priority,
        scope: agent?.scope ?? "personal",
        due_at: decision.dueAt,
        involves_money: false,
        required_tools: decision.requiredTools,
        requires_approval: false,
      })
      .select()
      .maybeSingle();
    if (taskRes.error || !taskRes.data) {
      throw new Error(taskRes.error?.message ?? "Could not create discovery task");
    }
    const task = taskRes.data;

    const shoppingTaskRes = await sb
      .from("shopping_tasks")
      .insert({
        user_id: userId,
        agent_id: agent?.id ?? null,
        task_id: task.id,
        requirement: decision.searchQuery ?? data.request,
        budget,
        currency,
        notes: decision.preferences ? JSON.stringify(decision.preferences) : null,
        status: "running",
      })
      .select()
      .maybeSingle();
    if (shoppingTaskRes.error || !shoppingTaskRes.data) {
      await sb.from("personal_tasks").update({ status: "failed" }).eq("id", task.id).eq("user_id", userId);
      throw new Error(shoppingTaskRes.error?.message ?? "Could not start live discovery");
    }
    const shoppingTask = shoppingTaskRes.data;

    await activity(sb, userId, `Searching live sources: ${decision.title}`, "task_started", {
      agent_id: agent?.id ?? null,
      task_id: task.id,
    });

    try {
      const googleConfigured = googleShoppingConfigured();
      const research = await runShoppingResearch({
        requirement: decision.searchQuery ?? data.request,
        budget,
        currency,
        allowedDomains: DEFAULT_DOMAINS,
        allowedTools,
      });

      const insertRows = research.offers.map((offer, index) => ({
        shopping_task_id: shoppingTask.id,
        product: offer.product,
        price: offer.price,
        currency: offer.currency,
        seller: offer.seller,
        delivery: offer.delivery,
        delivery_cost: offer.deliveryCost,
        rating: offer.rating,
        url: offer.url,
        specs: offer.specs,
        reason: offer.reason,
        in_stock: offer.inStock,
        selected: index === 0,
      }));

      const resultsRes = insertRows.length
        ? await sb.from("shopping_results").insert(insertRows).select()
        : { data: [], error: null };
      if (resultsRes.error) throw new Error(resultsRes.error.message);
      const results = resultsRes.data ?? [];
      const diagnostic = providerDiagnostic(googleConfigured, research.provider, results.length);

      await sb
        .from("shopping_tasks")
        .update({ status: "completed" })
        .eq("id", shoppingTask.id)
        .eq("user_id", userId);
      await sb
        .from("personal_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: {
            type: "shopping_discovery",
            results: results.length,
            shopping_task_id: shoppingTask.id,
            provider: research.provider,
            simulated: research.simulated,
            provider_diagnostic: diagnostic,
          },
        })
        .eq("id", task.id)
        .eq("user_id", userId);

      await activity(
        sb,
        userId,
        `Live Explorer found ${results.length} matching option${results.length === 1 ? "" : "s"}`,
        "results_found",
        { agent_id: agent?.id ?? null, task_id: task.id, metadata: { provider_diagnostic: diagnostic } },
      );
      await audit(sb, userId, "discovery_search_performed", {
        agent_id: agent?.id ?? null,
        target_type: "shopping_task",
        target_id: shoppingTask.id,
        metadata: {
          results: results.length,
          budget,
          provider: research.provider,
          simulated: research.simulated,
          read_only: true,
          provider_diagnostic: diagnostic,
        },
      });

      return {
        handled: true as const,
        discovery: true as const,
        taskId: task.id,
        shoppingTaskId: shoppingTask.id,
        decision,
        results,
        provider: research.provider,
        simulated: research.simulated,
        providerDiagnostic: diagnostic,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Live discovery failed";
      await sb
        .from("shopping_tasks")
        .update({ status: "failed", notes: message })
        .eq("id", shoppingTask.id)
        .eq("user_id", userId);
      await sb
        .from("personal_tasks")
        .update({ status: "failed", result: { error: message } })
        .eq("id", task.id)
        .eq("user_id", userId);
      await activity(sb, userId, `Live Explorer failed: ${message}`, "failed", {
        agent_id: agent?.id ?? null,
        task_id: task.id,
      });
      throw error;
    }
  });
