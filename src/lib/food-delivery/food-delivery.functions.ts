import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FoodDeliveryCapability } from "./contracts";
import {
  buildFoodDeliveryHubStatus,
  foodDeliveryCredentialPresence,
  refuseFoodDeliverySideEffect,
} from "./hub-status";

const CAPABILITIES = [
  "consumer.restaurant_search",
  "consumer.menu_read",
  "consumer.cart_write",
  "consumer.order_create",
  "consumer.order_track",
  "merchant.store_read",
  "merchant.store_write",
  "merchant.menu_read",
  "merchant.menu_write",
  "merchant.inventory_write",
  "merchant.order_read",
  "merchant.order_accept",
  "merchant.order_reject",
  "merchant.order_cancel",
  "merchant.reporting_read",
  "merchant.promotion_write",
  "delivery.quote",
  "delivery.create",
  "delivery.track",
] as const satisfies readonly FoodDeliveryCapability[];

const hubInput = z.object({
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Enter a two-letter country code."),
  deliveryAddress: z.string().trim().max(240).optional().or(z.literal("")),
});

export const getFoodDeliveryHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => hubInput.parse(value))
  .handler(async ({ data }) =>
    buildFoodDeliveryHubStatus({
      countryCode: data.countryCode,
      ...(data.deliveryAddress ? { deliveryAddress: data.deliveryAddress } : {}),
      credentialPresence: foodDeliveryCredentialPresence(process.env),
    }),
  );

export const previewFoodDeliveryAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ capability: z.enum(CAPABILITIES) }).parse(value))
  .handler(async ({ data }) => refuseFoodDeliverySideEffect(data.capability));
