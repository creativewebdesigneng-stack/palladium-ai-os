export interface MobileFeatureCertification {
  serverCoreReady: boolean;
  persistenceReady: boolean;
  iosNativeCertified: boolean;
  androidNativeCertified: boolean;
}

export function mobileFeatureCompletion(status: MobileFeatureCertification): number {
  const gates = [status.serverCoreReady, status.persistenceReady, status.iosNativeCertified, status.androidNativeCertified];
  return Math.round((gates.filter(Boolean).length / gates.length) * 100);
}

export function isMobileFeatureFullyCertified(status: MobileFeatureCertification): boolean {
  return mobileFeatureCompletion(status) === 100;
}
