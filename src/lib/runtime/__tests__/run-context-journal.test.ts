import { describe, expect, it } from "vitest";
import {
  compactRunContextInPlace,
  estimateRunContextChars,
  RUN_JOURNAL_MAX_CHARS,
  RUN_JOURNAL_PREFIX,
} from "../run-context-journal.server";
import type { ChatMessage } from "../model-gateway.server";

function toolRound(id: string, payload: string): ChatMessage[] {
  return [
    {
      role: "assistant",
      content: `working ${id}`,
      tool_calls: [{ id: `call-${id}`, name: "web_search", arguments: { q: id } }],
    },
    {
      role: "tool",
      tool_call_id: `call-${id}`,
      name: "web_search",
      content: payload,
    },
  ];
}

describe("run context journal", () => {
  it("leaves a context under budget untouched and preserves array identity", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "system" },
      { role: "user", content: "original task" },
      ...toolRound("one", "short result"),
    ];
    const same = messages;

    const result = compactRunContextInPlace(messages, { compactAtChars: 5_000, targetChars: 3_000 });

    expect(result.compacted).toBe(false);
    expect(messages).toBe(same);
    expect(messages.some((message) => message.content.startsWith(RUN_JOURNAL_PREFIX))).toBe(false);
  });

  it("compacts only older complete tool rounds and keeps the newest round verbatim", () => {
    const oldPayload = `OLD_HEAD-${"x".repeat(4_000)}-OLD_TAIL`;
    const newestPayload = `NEW_HEAD-${"y".repeat(4_000)}-NEW_TAIL`;
    const messages: ChatMessage[] = [
      { role: "system", content: "system rules" },
      { role: "user", content: "original task" },
      ...toolRound("old", oldPayload),
      ...toolRound("new", newestPayload),
    ];

    const before = estimateRunContextChars(messages);
    const result = compactRunContextInPlace(messages, {
      compactAtChars: 5_000,
      targetChars: 3_000,
      preserveRecentToolRounds: 1,
    });

    expect(result.compacted).toBe(true);
    expect(result.compactedToolRounds).toBe(1);
    expect(result.afterChars).toBeLessThan(before);
    const journal = messages.find((message) => message.content.startsWith(RUN_JOURNAL_PREFIX));
    expect(journal?.content).toContain("web_search");
    expect(journal?.content).toContain("OLD_HEAD");
    expect(journal?.content).toContain("OLD_TAIL");
    expect(messages.some((message) => message.content === newestPayload)).toBe(true);
    expect(messages.some((message) => message.tool_call_id === "call-new")).toBe(true);
  });

  it("never removes operator task or steering messages", () => {
    const steering =
      "OPERATOR STEERING (new instructions for this active run):\nFocus on inventory instead.";
    const messages: ChatMessage[] = [
      { role: "system", content: "system rules" },
      { role: "user", content: "research suppliers" },
      ...toolRound("one", "a".repeat(4_000)),
      { role: "user", content: steering },
      ...toolRound("two", "b".repeat(4_000)),
    ];

    compactRunContextInPlace(messages, { compactAtChars: 5_000, targetChars: 3_000 });

    expect(messages.some((message) => message.role === "user" && message.content === "research suppliers")).toBe(true);
    expect(messages.some((message) => message.role === "user" && message.content === steering)).toBe(true);
  });

  it("does not orphan assistant/tool protocol messages", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "system" },
      { role: "user", content: "task" },
      ...toolRound("one", "a".repeat(4_000)),
      ...toolRound("two", "b".repeat(4_000)),
      ...toolRound("three", "c".repeat(4_000)),
    ];

    compactRunContextInPlace(messages, { compactAtChars: 6_000, targetChars: 3_500 });

    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index]!;
      if (message.role !== "tool") continue;
      const previousAssistant = [...messages.slice(0, index)]
        .reverse()
        .find((candidate) => candidate.role === "assistant" && candidate.tool_calls?.length);
      expect(previousAssistant?.tool_calls?.some((call) => call.id === message.tool_call_id)).toBe(true);
    }
  });

  it("reuses one journal instead of nesting duplicate journal messages", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "system" },
      { role: "user", content: "task" },
      ...toolRound("one", "a".repeat(4_000)),
      ...toolRound("two", "b".repeat(4_000)),
    ];

    compactRunContextInPlace(messages, { compactAtChars: 5_000, targetChars: 3_000 });
    messages.push(...toolRound("three", "c".repeat(5_000)));
    compactRunContextInPlace(messages, { compactAtChars: 5_000, targetChars: 3_000 });

    const journals = messages.filter((message) => message.content.startsWith(RUN_JOURNAL_PREFIX));
    expect(journals).toHaveLength(1);
    expect(journals[0]!.content.length).toBeLessThanOrEqual(
      RUN_JOURNAL_MAX_CHARS + RUN_JOURNAL_PREFIX.length + 300,
    );
  });

  it("refuses to compact the only/latest tool round", () => {
    const payload = "z".repeat(10_000);
    const messages: ChatMessage[] = [
      { role: "system", content: "system" },
      { role: "user", content: "task" },
      ...toolRound("latest", payload),
    ];

    const result = compactRunContextInPlace(messages, { compactAtChars: 2_000, targetChars: 1_000 });

    expect(result.compacted).toBe(false);
    expect(messages.some((message) => message.content === payload)).toBe(true);
  });
});
