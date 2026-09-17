export type MobilePlatform = 'ios' | 'android';
export type MobileExecutionTarget = 'device' | 'astra' | 'hybrid';
export type MobileRisk = 'low' | 'medium' | 'high';

export type MobileCapability =
  | 'generate_text'
  | 'summarize'
  | 'rewrite'
  | 'classify'
  | 'extract'
  | 'image_understanding'
  | 'voice_input'
  | 'app_action'
  | 'notification'
  | 'camera_context';

export interface MobileDeviceCapabilities {
  platform: MobilePlatform;
  osVersion: string;
  nativeIntelligenceAvailable: boolean;
  nativeProvider?: 'apple-foundation-models' | 'gemini-nano' | 'other';
  capabilities: MobileCapability[];
  appActionsAvailable: boolean;
}

export interface MobileIntelligenceRequest {
  requestId: string;
  deviceId: string;
  capability: MobileCapability;
  risk: MobileRisk;
  input: unknown;
  preferOnDevice?: boolean;
  requiresNetwork?: boolean;
}

export interface MobileRoutingDecision {
  target: MobileExecutionTarget;
  requiresApproval: boolean;
  reason: string;
  capability: MobileCapability;
}

export interface MobileExecutionEnvelope {
  request: MobileIntelligenceRequest;
  decision: MobileRoutingDecision;
  createdAt: string;
  auditVersion: 1;
}
