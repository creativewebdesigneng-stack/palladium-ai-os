import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brokerExecutionDecision } from "./broker-authorisation";

const request = z
  .object({
    symbol: z.string().trim().max(30).optional(),
  })
  .optional();

export const getTradingBrokerDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => request.parse(value ?? {}))
  .handler(async () => brokerExecutionDecision(process.env));
