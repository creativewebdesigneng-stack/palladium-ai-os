import type { MobileDeviceCapabilities } from './contracts';

export interface PairedMobileDevice {
  id: string;
  userId: string;
  displayName: string;
  capabilities: MobileDeviceCapabilities;
  pairedAt: string;
  lastSeenAt?: string;
  revokedAt?: string;
}

export function canUsePairedDevice(device: PairedMobileDevice): boolean {
  return !device.revokedAt && device.capabilities.osVersion.trim().length > 0;
}

export function revokePairedDevice(device: PairedMobileDevice, at = new Date()): PairedMobileDevice {
  return { ...device, revokedAt: at.toISOString() };
}
