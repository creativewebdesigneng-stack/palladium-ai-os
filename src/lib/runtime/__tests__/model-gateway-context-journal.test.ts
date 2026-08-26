import { beforeEach, describe, expect, it, vi } from "vitest";

const baseMock = vi.hoisted(() => ({ runChat: vi.fn(), streamChat: vi.fn() }));
vi.mock("../model-gateway.base", async () => {
  const actual = await vi.importActual<any>("../model-gateway.base");
  return { ...actual, runChat: baseMock.runChat, streamChat: baseMock.streamChat };
});

vi.mock("@/lib/ai/web-access.server", () => ({
  searchPublicWeb: vi.fn(async () => ({ results: [], source: "test" })),
}));

import { runChat, streamChat } from "../model-gateway.server";
import { RUN_JOURNAL_PREFIX } from "../run-context-journal.server";
import type { ChatMessage, RunArgs } from "../model-gateway.base";

function round(id: string, size = 19_000): ChatMessage[] {
  return [
    {
      role: "assistant",
      content: "",
      tool_calls: [{ id: `call-${id}`, name: "web_search", arguments: { q: id } }],
    },
    {
      role: "tool",
      tool_call_id: `call-${id}`,
      name: "web_search",
      content: `${id}-HEAD-${"x".repeat(size)}-${id}-TAIL`,
    },
  ];
}

function args(messages: ChatMessage[]): RunArgs {
  return {
    provider: "openai",
    model: "gpt-5-mini",
    messages,
    tools: [],
    temperature: 0.2,
    maxTokens: 1000,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  baseMock.runChat.mockResolvedValue({
    text: "done",
    toolCalls: [],
    usage: { input: 1, output: 1 },
    provider: "openai",
    model: "gpt-5-mini",
  });
  baseMock.streamChat.mockImplementation(async function* () {
    yield {
      type: "done",
      result: {
        text: "done",
        toolCalls: [],
        usage: { input: 1, output: 1 },
        provider: "openai",
        model: "gpt-5-mini",
      },
    };
  });
});

describe("model gateway run context journaling", () => {
  it("journals oversized non-streaming context in place before provider execution", async () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "system" },
      { role: "user", content: "original task" },
      ...round("old"),
      ...round("new"),
    ];
    const identity = messages;

    await runChat(args(messages));

    expect(messages).toBe(identity);
    expect(messages.some((message) => message.content.startsWith(RUN_JOURNAL_PREFIX))).toBe(true);
    expect(messages.some((message) => message.content.includes("new-HEAD"))).toBe(true);
    expect(baseMock.runChat.mock.calls[0]?.[0].messages).toBe(identity);
  });

  it("applies the identical context policy before streaming provider execution", async () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "system" },
      { role: "user", content: "original task" },
      ...round("old"),
      ...round("new"),
    ];

    const events = [];
    for await (const event of streamChat(args(messages))) events.push(event);

    expect(events).toHaveLength(1);
    expect(messages.some((message) => message.content.startsWith(RUN_JOURNAL_PREFIX))).toBe(true);
    expect(baseMock.streamChat.mock.calls[0]?.[0].messages).toBe(messages);
  });
});
