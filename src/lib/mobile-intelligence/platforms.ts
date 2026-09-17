import type { MobileDeviceCapabilities, MobilePlatform } from './contracts';

export interface MobilePlatformReport {
  platform: MobilePlatform;
  osVersion: string;
  nativeIntelligenceAvailable: boolean;
  nativeProvider?: MobileDeviceCapabilities['nativeProvider'];
  capabilities?: MobileDeviceCapabilities['capabilities'];
  appActionsAvailable?: boolean;
}

export function normalizeMobilePlatformReport(
  report: MobilePlatformReport,
): MobileDeviceCapabilities {
  const normalized: MobileDeviceCapabilities = {
    platform: report.platform,
    osVersion: report.osVersion,
    nativeIntelligenceAvailable: report.nativeIntelligenceAvailable,
    capabilities: [...new Set(report.capabilities ?? [])],
    appActionsAvailable: report.appActionsAvailable === true,
  };
  const provider = report.nativeProvider ??
    (report.nativeIntelligenceAvailable
      ? report.platform === 'ios' ? 'apple-foundation-models' : 'gemini-nano'
      : undefined);
  if (provider) normalized.nativeProvider = provider;
  return normalized;
}

export function supportsNativeAppActions(device: MobileDeviceCapabilities): boolean {
  return device.appActionsAvailable && device.capabilities.includes('app_action');
}
