import { createServerFn } from '@tanstack/react-start';
import { requireLaunchFeatureAuth } from '@/integrations/supabase/auth-middleware';
import {
  retailReceptionistInquirySchema,
  runRetailReceptionistCore,
} from './retail-receptionist-core.server';

type Sb = {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => any;
};

export const runRetailReceptionistInquiry = createServerFn({ method: 'POST' })
  .middleware([requireLaunchFeatureAuth("communications")])
  .inputValidator((value: unknown) => retailReceptionistInquirySchema.parse(value))
  .handler(async ({ data, context }) => {
    return runRetailReceptionistCore({
      sb: context.supabase as unknown as Sb,
      userId: context.userId,
      data,
      surface: 'retail_receptionist',
    });
  });
