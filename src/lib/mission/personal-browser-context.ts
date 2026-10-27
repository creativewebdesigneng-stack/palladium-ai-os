import type { ChatMessage, ToolCall } from "@/lib/runtime/model-gateway.base";
import { isDomainAllowed } from "./browser-agent";

/** Restore only a missing read URL from this run's last verified navigation.
 * Resolve before approval, so the exact approved payload includes the URL.
 * Never use page text, a failed navigation, another tool, or model prose.
 */
export function withPersonalBrowserUrl(call: ToolCall, messages: ChatMessage[], allowedDomains: string[]): ToolCall {
  if (call.name !== "browser" || !["read", "extract"].includes(String(call.arguments["action"] ?? "read"))) return call;
  const supplied = call.arguments["url"];
  if (supplied !== undefined && (typeof supplied !== "string" || supplied.trim())) return call;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]!;
    if (message.role !== "tool" || !message.tool_call_id) continue;
    const original = messages.slice(0, i).flatMap((m) => m.role === "assistant" ? m.tool_calls ?? [] : [])
      .find((candidate) => candidate.id === message.tool_call_id);
    if (original?.name !== "browser" || original.arguments["action"] !== "navigate") continue;
    // The latest completed navigation supersedes the old destination even when
    // it failed. Do not quietly read the previous page after a navigation error.
    try {
      const output = JSON.parse(message.content);
      const url = output?.result?.url;
      if (output?.error || output?.simulated !== false || output?.result?.ok !== true || typeof url !== "string") return call;
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password || !isDomainAllowed(url, allowedDomains)) return call;
      return { ...call, arguments: { ...call.arguments, url } };
    } catch { return call; }
  }
  return call;
}
