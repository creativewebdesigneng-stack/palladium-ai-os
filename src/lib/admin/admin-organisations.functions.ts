import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";

type Sb = { from: (t: string) => any };

const FORBIDDEN = { forbidden: true as const };

export const listAdminOrganisationsDetailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const caller = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(caller as never, context.userId))) return FORBIDDEN;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;
    const { data: orgs, error } = await admin
      .from("organisations")
      .select("id,name,slug,billing_email,owner_id,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = orgs ?? [];
    const orgIds = rows.map((row: any) => String(row.id));
    const ownerIds = [...new Set(rows.map((row: any) => String(row.owner_id)).filter(Boolean))];
    if (!orgIds.length) return { forbidden: false as const, organisations: [] };

    const [subsRes, plansRes, membersRes, teamsRes, agentsRes, ownersRes] = await Promise.all([
      admin
        .from("subscriptions")
        .select("org_id,plan_code,status,seats,created_at,current_period_start,current_period_end,cancel_at_period_end")
        .in("org_id", orgIds),
      admin
        .from("plans")
        .select("code,name,price_pence,currency,billing_interval")
        .eq("is_active", true),
      admin
        .from("organisation_members")
        .select("org_id,user_id,role,created_at")
        .in("org_id", orgIds),
      admin.from("teams").select("id,org_id,name").in("org_id", orgIds),
      admin
        .from("personal_agents")
        .select("id,name,user_id,org_id,org_id_fk,status")
        .or(`org_id.in.(${orgIds.join(",")}),org_id_fk.in.(${orgIds.join(",")})`),
      ownerIds.length
        ? admin.from("profiles").select("id,email,full_name").in("id", ownerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const result of [subsRes, plansRes, membersRes, teamsRes, agentsRes, ownersRes]) {
      if (result.error) throw new Error(result.error.message);
    }

    const memberRows = membersRes.data ?? [];
    const memberUserIds = [...new Set(memberRows.map((row: any) => String(row.user_id)).filter(Boolean))];
    const { data: memberProfiles, error: memberProfileError } = memberUserIds.length
      ? await admin.from("profiles").select("id,email,full_name").in("id", memberUserIds)
      : { data: [], error: null };
    if (memberProfileError) throw new Error(memberProfileError.message);

    const profileById = new Map<string, any>(
      [...(ownersRes.data ?? []), ...(memberProfiles ?? [])].map((row: any) => [String(row.id), row]),
    );
    const subByOrg = new Map<string, any>(
      (subsRes.data ?? []).map((row: any) => [String(row.org_id), row]),
    );
    const planByCode = new Map<string, any>(
      (plansRes.data ?? []).map((row: any) => [String(row.code), row]),
    );

    return {
      forbidden: false as const,
      organisations: rows.map((org: any) => {
        const id = String(org.id);
        const subscription = subByOrg.get(id) ?? null;
        const plan = subscription ? planByCode.get(String(subscription.plan_code)) ?? null : null;
        const owner = profileById.get(String(org.owner_id)) ?? null;
        const members = memberRows
          .filter((row: any) => String(row.org_id) === id)
          .map((row: any) => {
            const profile = profileById.get(String(row.user_id)) ?? null;
            return {
              id: String(row.user_id),
              name: String(profile?.full_name ?? profile?.email ?? "Unnamed member"),
              email: String(profile?.email ?? ""),
              role: String(row.role ?? "member"),
              joinedAt: row.created_at ? String(row.created_at) : null,
            };
          });
        const teams = (teamsRes.data ?? [])
          .filter((row: any) => String(row.org_id) === id)
          .map((row: any) => ({ id: String(row.id), name: String(row.name) }));
        const agents = (agentsRes.data ?? [])
          .filter(
            (row: any) => String(row.org_id ?? "") === id || String(row.org_id_fk ?? "") === id,
          )
          .map((row: any) => ({
            id: String(row.id),
            name: String(row.name ?? "Unnamed agent"),
            status: String(row.status ?? "unknown"),
          }));
        const pricePence = plan ? Number(plan.price_pence ?? 0) : null;

        return {
          id,
          name: String(org.name),
          slug: String(org.slug ?? ""),
          owner: String(owner?.full_name ?? owner?.email ?? "—"),
          ownerEmail: String(owner?.email ?? ""),
          billingEmail: org.billing_email ? String(org.billing_email) : null,
          createdAt: String(org.created_at),
          members,
          teams,
          agents,
          subscription: subscription
            ? {
                planCode: String(subscription.plan_code),
                planName: String(plan?.name ?? subscription.plan_code),
                status: String(subscription.status),
                seats: Number(subscription.seats ?? 0),
                monthlyPricePence: pricePence,
                currency: String(plan?.currency ?? "GBP"),
                billingInterval: String(plan?.billing_interval ?? "month"),
                startedAt: subscription.created_at ? String(subscription.created_at) : null,
                currentPeriodStart: subscription.current_period_start
                  ? String(subscription.current_period_start)
                  : null,
                currentPeriodEnd: subscription.current_period_end
                  ? String(subscription.current_period_end)
                  : null,
                cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
              }
            : null,
        };
      }),
    };
  });
