import type { MobileDeviceCapabilities } from './contracts';

export interface MobileDeviceRow {
  id: string;
  user_id: string;
  display_name: string;
  platform: MobileDeviceCapabilities['platform'];
  os_version: string;
  native_intelligence_available: boolean;
  native_provider?: MobileDeviceCapabilities['nativeProvider'] | null;
  capabilities: MobileDeviceCapabilities['capabilities'];
  app_actions_available: boolean;
  paired_at: string;
  last_seen_at?: string | null;
  revoked_at?: string | null;
}

export function rowToMobileCapabilities(row: MobileDeviceRow): MobileDeviceCapabilities {
  const capabilities: MobileDeviceCapabilities = {
    platform: row.platform,
    osVersion: row.os_version,
    nativeIntelligenceAvailable: row.native_intelligence_available,
    capabilities: row.capabilities,
    appActionsAvailable: row.app_actions_available,
  };
  if (row.native_provider) capabilities.nativeProvider = row.native_provider;
  return capabilities;
}
