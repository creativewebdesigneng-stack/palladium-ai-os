/**
 * Client helper for streaming agent runs.
 *
 * Talks to the same-origin `/api/agents/run` endpoint with the operator's
 * session token so the runtime can authenticate the caller. Falls back to the
 * non-streaming server function when streaming is unavailable.
 */
import { supabase } from "@/integrations/supabase/client";
import { runAgentTask } from "./runtime.functions";

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Please sign in to run agents.");
  return token;
}

/**
 * Streams a run. `onEvent` receives runtime events:
 *  { type: 'status' | 'delta' | 'tool' | 'error' | 'complete', ... }
 */
export async function streamAgentRun({ agentId, input, onEvent, signal }) {
  const token = await accessToken();
  const res = await fetch("/api/agents/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ agent_id: agentId, input }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = "The agent runtime is unavailable.";
    try {
      const payload = await res.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* keep the default message */
    }
    // Streaming unavailable — try the buffered path before giving up.
    if (res.status >= 500) {
      const result = await runAgentTask({ data: { agent_id: agentId, input } });
      onEvent?.({ type: "complete", task: result.task });
      return result.task;
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let task = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let event;
      try {
        event = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (event.type === "complete") task = event.task;
      onEvent?.(event);
    }
  }

  return task;
}
