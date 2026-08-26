/**
 * Long-running agent context journal.
 *
 * Pattern adapted from Atomic Agent (MIT, Copyright (c) 2026 Atomic Bot): keep
 * the newest execution context verbatim while collapsing older completed tool
 * rounds into a bounded progress journal. This implementation is PalladiumAI-
 * specific and never changes persisted audit/tool records, approval state, or
 * the operator's original/steering instructions.
 */
import type { ChatMessage, ToolCall } from "./model-gateway.server";

export const RUN_CONTEXT_COMPACT_AT_CHARS = 36_000;
export const RUN_CONTEXT_TARGET_CHARS = 26_000;
export const RUN_JOURNAL_MAX_CHARS = 8_000;
export const RUN_JOURNAL_PREFIX = "PALLADIUM RUN JOURNAL";

export type RunContextCompaction = {
  compacted: boolean;
  beforeChars: number;
  afterChars: number;
  compactedToolRounds: number;
};

type MessageBlock = {
  messages: ChatMessage[];
  toolRound: boolean;
};

function messageChars(message: ChatMessage): number {
  let size = message.content?.length ?? 0;
  if (message.tool_calls?.length) {
    try {
      size += JSON.stringify(message.tool_calls).length;
    } catch {
      size += 500;
    }
  }
  return size + 32;
}

export function estimateRunContextChars(messages: readonly ChatMessage[]): number {
  return messages.reduce((total, message) => total + messageChars(message), 0);
}

function blocksFor(messages: readonly ChatMessage[]): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]!;
    if (message.role === "assistant" && message.tool_calls?.length) {
      const block = [message];
      let cursor = index + 1;
      while (cursor < messages.length && messages[cursor]?.role === "tool") {
        block.push(messages[cursor]!);
        cursor += 1;
      }
      blocks.push({ messages: block, toolRound: true });
      index = cursor - 1;
      continue;
    }
    blocks.push({ messages: [message], toolRound: false });
  }
  return blocks;
}

function compactSnippet(value: string, limit = 520): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const tail = Math.min(160, Math.floor(limit * 0.3));
  const head = limit - tail - 20;
  return `${text.slice(0, head)} … [middle omitted] … ${text.slice(-tail)}`;
}

function callSummary(call: ToolCall): string {
  let args = "{}";
  try {
    args = JSON.stringify(call.arguments ?? {});
  } catch {
    args = "[unserialisable arguments]";
  }
  return `${call.name} ${compactSnippet(args, 260)}`;
}

function journalRound(block: MessageBlock): string {
  const assistant = block.messages[0];
  const calls = assistant?.tool_calls ?? [];
  const lines: string[] = [];
  if (assistant?.content?.trim()) lines.push(`Agent note: ${compactSnippet(assistant.content, 360)}`);
  if (calls.length) lines.push(`Tools requested: ${calls.map(callSummary).join(" | ")}`);
  for (const message of block.messages.slice(1)) {
    lines.push(`Result from ${message.name ?? "tool"}: ${compactSnippet(message.content, 700)}`);
  }
  return lines.join("\n");
}

function boundedJournal(existing: string, additions: string[]): string {
  const existingBody = existing.startsWith(RUN_JOURNAL_PREFIX)
    ? existing.slice(RUN_JOURNAL_PREFIX.length).replace(/^\s*\n+/, "")
    : "";
  const parts = [existingBody, ...additions].filter(Boolean);
  let body = parts.join("\n\n--- earlier completed tool round ---\n\n");
  if (body.length > RUN_JOURNAL_MAX_CHARS) {
    body = `[older journal entries omitted]\n${body.slice(-(RUN_JOURNAL_MAX_CHARS - 32))}`;
  }
  return (
    `${RUN_JOURNAL_PREFIX}\n` +
    "Earlier completed tool rounds were compacted for model context only. Treat this as progress already made; do not repeat these calls unless new information requires it. Persisted tool/audit records are unchanged.\n\n" +
    body
  );
}

/**
 * Compacts only complete, older assistant-tool protocol blocks. The newest
 * completed tool round remains verbatim, as do every system/user message
 * (including the original task and any mid-run steering). The array is mutated
 * in place so model-gateway conversation identity and provider failover state
 * remain stable across rounds.
 */
export function compactRunContextInPlace(
  messages: ChatMessage[],
  options?: { compactAtChars?: number; targetChars?: number; preserveRecentToolRounds?: number },
): RunContextCompaction {
  const compactAt = Math.max(options?.compactAtChars ?? RUN_CONTEXT_COMPACT_AT_CHARS, 2_000);
  const target = Math.min(
    compactAt,
    Math.max(options?.targetChars ?? RUN_CONTEXT_TARGET_CHARS, 1_000),
  );
  const preserveRecent = Math.max(options?.preserveRecentToolRounds ?? 1, 1);
  const beforeChars = estimateRunContextChars(messages);
  if (beforeChars <= compactAt) {
    return { compacted: false, beforeChars, afterChars: beforeChars, compactedToolRounds: 0 };
  }

  const existingJournal = messages.find(
    (message) => message.role === "system" && message.content.startsWith(RUN_JOURNAL_PREFIX),
  );
  const source = messages.filter((message) => message !== existingJournal);
  const blocks = blocksFor(source);
  const toolIndexes = blocks
    .map((block, index) => (block.toolRound ? index : -1))
    .filter((index) => index >= 0);
  const compactable = toolIndexes.slice(0, Math.max(0, toolIndexes.length - preserveRecent));
  if (!compactable.length) {
    return { compacted: false, beforeChars, afterChars: beforeChars, compactedToolRounds: 0 };
  }

  const remove = new Set<number>();
  const additions: string[] = [];
  let projected = beforeChars;
  for (const index of compactable) {
    if (projected <= target) break;
    const block = blocks[index]!;
    remove.add(index);
    additions.push(journalRound(block));
    projected -= block.messages.reduce((total, message) => total + messageChars(message), 0);
  }
  if (!remove.size) {
    return { compacted: false, beforeChars, afterChars: beforeChars, compactedToolRounds: 0 };
  }

  const journal: ChatMessage = {
    role: "system",
    content: boundedJournal(existingJournal?.content ?? "", additions),
  };
  const rebuilt: ChatMessage[] = [];
  let journalInserted = false;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    if (remove.has(index)) continue;
    for (const message of block.messages) {
      rebuilt.push(message);
      if (!journalInserted && message.role === "system") {
        rebuilt.push(journal);
        journalInserted = true;
      }
    }
  }
  if (!journalInserted) rebuilt.unshift(journal);

  messages.splice(0, messages.length, ...rebuilt);
  const afterChars = estimateRunContextChars(messages);
  return {
    compacted: true,
    beforeChars,
    afterChars,
    compactedToolRounds: remove.size,
  };
}
