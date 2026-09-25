import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

const fulfilInput = z.object({
  order_id: z.string().uuid(),
  delivery_reference: z.string().trim().max(2000).optional().default(""),
  instructions: z.string().trim().max(10000).optional().default(""),
}).refine((v) => !!v.delivery_reference || !!v.instructions, {
  message: "Delivery evidence is required.",
});

export const getSellerMarketplaceOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("marketplace_orders")
      .select("id,listing_id,buyer_id,seller_id,sale_price_pence,currency,status,paid_at,fulfilled_at,refunded_pence,refund_state,marketplace_listings(title,delivery_type),marketplace_deliveries(id,status,delivery_type,delivered_at)")
      .eq("seller_id", context.userId)
      .in("status", ["paid", "fulfilled", "disputed", "refunded", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const fulfilMarketplaceOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => fulfilInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: result, error } = await sb.rpc("marketplace_fulfil_paid_order", {
      p_order_id: data.order_id,
      p_delivery_reference: data.delivery_reference || null,
      p_instructions: data.instructions || null,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;
    if (!row || row.order_id !== data.order_id || row.order_status !== "fulfilled" ||
        row.delivery_status !== "delivered" || !row.delivered_at) {
      throw new Error("Marketplace fulfilment did not return verified delivery evidence.");
    }
    return row;
  });
