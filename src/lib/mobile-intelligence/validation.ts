import { z } from 'zod';

export const mobileCapabilitySchema = z.enum([
  'generate_text', 'summarize', 'rewrite', 'classify', 'extract', 'image_understanding',
  'voice_input', 'app_action', 'notification', 'camera_context',
]);

export const mobilePlatformReportSchema = z.object({
  platform: z.enum(['ios', 'android']),
  osVersion: z.string().trim().min(1).max(64),
  nativeIntelligenceAvailable: z.boolean(),
  nativeProvider: z.enum(['apple-foundation-models', 'gemini-nano', 'other']).optional(),
  capabilities: z.array(mobileCapabilitySchema).max(32).default([]),
  appActionsAvailable: z.boolean().default(false),
}).strict();

export const mobileIntelligenceRequestSchema = z.object({
  requestId: z.string().trim().min(1).max(128),
  deviceId: z.string().trim().min(1).max(128),
  capability: mobileCapabilitySchema,
  risk: z.enum(['low', 'medium', 'high']),
  input: z.unknown(),
  preferOnDevice: z.boolean().optional(),
  requiresNetwork: z.boolean().optional(),
}).strict();
