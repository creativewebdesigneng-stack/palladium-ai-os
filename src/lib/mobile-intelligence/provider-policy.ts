import type { MobileDeviceCapabilities } from './contracts';

export interface MobileProviderPolicy {
  provider: MobileDeviceCapabilities['nativeProvider'];
  usable: boolean;
  reason: string;
}

export function assessNativeProvider(device: MobileDeviceCapabilities): MobileProviderPolicy {
  if (!device.nativeIntelligenceAvailable) return { provider: undefined, usable: false, reason: 'Native intelligence is unavailable on this device.' };
  if (!device.nativeProvider) return { provider: undefined, usable: false, reason: 'Device did not advertise a native intelligence provider.' };
  return { provider: device.nativeProvider, usable: true, reason: 'Provider was capability-detected by the native client.' };
}
