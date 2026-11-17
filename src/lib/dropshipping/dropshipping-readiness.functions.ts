import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/lib/launch/launch-auth-middleware';
import {listIntegrationCapabilities} from '@/lib/integrations/agent-integration-runtime.server';
import {buildDropshippingReadiness} from './dropshipping-readiness';

export const getDropshippingReadiness=createServerFn({method:'GET'})
  .middleware([requireLaunchFeatureAuth("commerce")])
  .handler(async({context})=>{
    const capabilities=await listIntegrationCapabilities(context.userId);
    return buildDropshippingReadiness(capabilities);
  });
