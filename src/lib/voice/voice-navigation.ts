export type VoiceNavigationIntent = {
  id: string;
  to: string;
  reply: string;
  patterns: RegExp[];
};

export const VOICE_NAVIGATION_INTENTS: readonly VoiceNavigationIntent[] = [
  {
    id: "create-agent",
    to: "/agent-builder",
    reply: "Opening Agent Builder.",
    patterns: [/\b(create|new|build|make)\s+(an?\s+)?agent\b/i],
  },
  {
    id: "create-project",
    to: "/projects",
    reply: "Opening Projects so you can create one.",
    patterns: [/\b(create|new|start|make)\s+(a\s+)?project\b/i],
  },
  {
    id: "dashboard",
    to: "/dashboard",
    reply: "Opening Dashboard.",
    patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?(dashboard|home)\b/i, /^\s*(dashboard|home)\s*$/i],
  },
  {
    id: "projects",
    to: "/projects",
    reply: "Opening Projects.",
    patterns: [/\b(open|go to|show( me)?|take me to)\s+(my\s+|the\s+)?projects?\b/i, /^\s*(my\s+)?projects?\s*$/i],
  },
  {
    id: "agent-builder",
    to: "/agent-builder",
    reply: "Opening Agent Builder.",
    patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?agent builder\b/i],
  },
  {
    id: "agents",
    to: "/agents",
    reply: "Opening Agents.",
    patterns: [/\b(open|go to|show( me)?|take me to)\s+(my\s+|the\s+)?agents?\b/i, /^\s*(my\s+)?agents?\s*$/i],
  },
  { id: "workflows", to: "/workflows", reply: "Opening Workflows.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(my\s+|the\s+)?workflows?\b/i] },
  { id: "tasks", to: "/tasks", reply: "Opening Tasks.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(my\s+|the\s+)?tasks?\b/i] },
  { id: "files", to: "/files", reply: "Opening Files.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(my\s+|the\s+)?files?\b/i] },
  { id: "settings", to: "/settings", reply: "Opening Settings.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?settings\b/i] },
  { id: "integrations", to: "/integrations", reply: "Opening Integrations.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?integrations?\b/i] },
  { id: "notifications", to: "/notifications", reply: "Opening Notifications.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(my\s+|the\s+)?notifications?\b/i] },
  { id: "fast-track", to: "/fast-track", reply: "Opening Fast Track.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?fast\s*track\b/i] },
  { id: "mission-control", to: "/mission-control", reply: "Opening Mission Control.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?mission control\b/i] },
  { id: "marketplace", to: "/marketplace", reply: "Opening Marketplace.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?marketplace\b/i] },
  { id: "knowledge", to: "/knowledge", reply: "Opening Knowledge.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?knowledge\b/i] },
  { id: "memory", to: "/memory", reply: "Opening Memory.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(my\s+|the\s+)?memory\b/i] },
  { id: "media-studio", to: "/media-studio", reply: "Opening Media Studio.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?media studio\b/i] },
  { id: "voice-studio", to: "/voice-studio", reply: "Opening Voice Studio.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?voice studio\b/i] },
  { id: "three-d-studio", to: "/three-d-studio", reply: "Opening 3D Studio.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?(3d|three d) studio\b/i] },
  { id: "social-operations", to: "/social-operations", reply: "Opening Social Operations.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?social operations\b/i] },
  { id: "commerce-studio", to: "/commerce-studio", reply: "Opening Commerce Studio.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?commerce studio\b/i] },
  { id: "crm", to: "/crm", reply: "Opening CRM.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?crm\b/i] },
  { id: "models", to: "/models", reply: "Opening Runtime Models.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?(runtime models?|models?)\b/i] },
  { id: "billing", to: "/billing", reply: "Opening Billing.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?billing\b/i] },
  { id: "skills", to: "/skills", reply: "Opening Skills.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?skills?\b/i] },
  { id: "automation", to: "/automation", reply: "Opening Automation.", patterns: [/\b(open|go to|show( me)?|take me to)\s+(the\s+)?automation\b/i] },
];

export function normalizeVoiceTranscript(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveVoiceNavigationIntent(value: unknown): VoiceNavigationIntent | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return VOICE_NAVIGATION_INTENTS.find((intent) => intent.patterns.some((pattern) => pattern.test(text))) ?? null;
}

export function isDuplicateVoiceTranscript(
  next: unknown,
  previous: { text: string; at: number } | null | undefined,
  now = Date.now(),
  windowMs = 6500,
): boolean {
  if (!previous) return false;
  const normalized = normalizeVoiceTranscript(next);
  if (!normalized) return true;
  return normalized === previous.text && now - previous.at <= windowMs;
}
