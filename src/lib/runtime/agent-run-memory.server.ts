import { storeMemory } from '@/lib/memory/memory.server';
import { loadMemoryPreferences } from '@/lib/memory/preferences.server';

type Sb = { from: (table: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any };

/**
 * Automatic agent-run memory is written only through the canonical, expiring,
 * privacy-sanitised agent_memories store. Never mirror unsanitised task content
 * into personal_memories: that bypasses the retention and sensitivity choices
 * made for automatic memory and creates an ungoverned duplicate.
 */
export async function captureCompletedAgentRunMemory(args: {
  sb: Sb;
  userId: string;
  agent: { id: string; name: string; memory_enabled: boolean | null };
  orgId: string | null;
  taskId: string;
  request: string;
  outcome: string;
  provider: string;
  model: string;
}): Promise<boolean> {
  if (args.agent.memory_enabled === false || !args.outcome.trim()) return false;

  // Unknown preferences are NOT consent. A failed preference read must not
  // trigger any automatic memory write to either storage table.
  const prefs = await loadMemoryPreferences(args.sb, args.userId);
  if (!prefs.auto_capture || !prefs.short_term_enabled) return false;

  const stored = await storeMemory({
    sb: args.sb,
    userId: args.userId,
    prefs,
    input: {
      content: `Task: ${args.request.slice(0, 300)}\nOutcome: ${args.outcome.slice(0, 1500)}`,
      memory_type: 'short_term',
      category: 'task',
      scope: 'agent',
      title: `${args.agent.name} run`,
      source: 'agent_runtime',
      agent_id: args.agent.id,
      task_id: args.taskId,
      org_id: args.orgId,
      metadata: { provider: args.provider, model: args.model },
      automatic: true,
    },
  });
  // storeMemory can decline sensitive content after sanitisation even when
  // automatic capture is enabled; no alternate persistence path is permitted.
  return Boolean(stored);
}
