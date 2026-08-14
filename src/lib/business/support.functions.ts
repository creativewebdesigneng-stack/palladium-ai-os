/**
 * Customer support server functions.
 *
 * Tickets and their conversation persist in `support_tickets` /
 * `support_messages`; every metric returned is computed from those rows.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const STATUSES = ["open", "pending", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const listSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const tickets = (data ?? []) as any[];
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const resolved7d = tickets.filter(
      (t) => t.resolved_at && Date.parse(t.resolved_at) >= week,
    );
    const rated = tickets.filter((t) => typeof t.satisfaction === "number");
    const responded = tickets.filter((t) => t.first_response_at);
    const avgResponseMinutes = responded.length
      ? Math.round(
          responded.reduce(
            (sum, t) =>
              sum + (Date.parse(t.first_response_at) - Date.parse(t.created_at)) / 60000,
            0,
          ) / responded.length,
        )
      : null;

    return {
      tickets,
      metrics: {
        open: tickets.filter((t) => t.status === "open").length,
        pending: tickets.filter((t) => t.status === "pending").length,
        resolved7d: resolved7d.length,
        total: tickets.length,
        csat: rated.length
          ? Math.round(
              (rated.reduce((s, t) => s + Number(t.satisfaction), 0) / (rated.length * 5)) *
                100,
            )
          : null,
        avgResponseMinutes,
      },
    };
  });

export const listTicketMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ticketId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("support_messages")
      .select("*")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        subject: z.string().trim().min(1).max(200),
        body: z.string().trim().max(4000).optional(),
        requester_name: z.string().trim().max(160).optional(),
        requester_email: z.string().trim().email().optional().or(z.literal("")),
        priority: z.enum(PRIORITIES).default("normal"),
        channel: z.enum(["web", "email", "chat", "phone", "api"]).default("web"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: created, error } = await sb
      .from("support_tickets")
      .insert({
        user_id: context.userId,
        subject: data.subject,
        body: data.body || null,
        requester_name: data.requester_name || null,
        requester_email: data.requester_email || null,
        priority: data.priority,
        channel: data.channel,
        status: "open",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const updateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUSES).optional(),
        priority: z.enum(PRIORITIES).optional(),
        assignee: z.string().trim().max(160).optional(),
        satisfaction: z.coerce.number().int().min(1).max(5).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const patch: Record<string, unknown> = {};
    if (data.status) {
      patch['status'] = data.status;
      patch['resolved_at'] =
        data.status === "resolved" || data.status === "closed"
          ? new Date().toISOString()
          : null;
    }
    if (data.priority) patch['priority'] = data.priority;
    if (data.assignee !== undefined) patch['assignee'] = data.assignee || null;
    if (data.satisfaction !== undefined) patch['satisfaction'] = data.satisfaction;

    const { data: updated, error } = await sb
      .from("support_tickets")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const addTicketMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        ticketId: z.string().uuid(),
        body: z.string().trim().min(1).max(4000),
        author_role: z.enum(["agent", "customer"]).default("agent"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: created, error } = await sb
      .from("support_messages")
      .insert({
        user_id: context.userId,
        ticket_id: data.ticketId,
        body: data.body,
        author_role: data.author_role,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.author_role === "agent") {
      const { data: ticket } = await sb
        .from("support_tickets")
        .select("first_response_at")
        .eq("id", data.ticketId)
        .maybeSingle();
      if (ticket && !ticket.first_response_at) {
        await sb
          .from("support_tickets")
          .update({ first_response_at: new Date().toISOString() })
          .eq("id", data.ticketId);
      }
    }
    return created;
  });

export const deleteTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("support_tickets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
