import type { MobileDeviceCapabilities } from './contracts';
import { assessNativeProvider } from './provider-policy';

export interface MobileBridgeHealth {
  ready: boolean;
  nativeReady: boolean;
  astraFallbackReady: boolean;
  reason: string;
}

export function assessMobileBridgeHealth(device: MobileDeviceCapabilities, astraFallbackReady: boolean): MobileBridgeHealth {
  const native = assessNativeProvider(device);
  const ready = native.usable || astraFallbackReady;
  return {
    ready,
    nativeReady: native.usable,
    astraFallbackReady,
    reason: ready ? 'At least one governed execution path is available.' : 'Neither native intelligence nor Astra fallback is available.',
  };
}
