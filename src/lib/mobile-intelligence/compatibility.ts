export const MOBILE_BRIDGE_PROTOCOL_VERSION = 1;

export function isCompatibleMobileBridgeVersion(version: number): boolean {
  return Number.isInteger(version) && version === MOBILE_BRIDGE_PROTOCOL_VERSION;
}
