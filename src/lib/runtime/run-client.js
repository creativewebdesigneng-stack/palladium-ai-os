/**
 * Client helper for streaming agent runs.
 *
 * Talks to the same-origin `/api/agents/run` endpoint with the operator's
 * session token so the runtime can authenticate the caller. Never automatically
 * replay an ambiguous request: the first request may already have started work.
 */
import { supabase } from "@/integrations/supabase/client";

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
    throw new Error(message);
  }

  if (!res.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream")) {
    throw new Error("The runtime returned an unexpected response. Check run history before trying again; no automatic retry was made.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const handle = (chunk) => {
    const data = chunk.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (!data) return null;
    let event;
    try { event = JSON.parse(data); } catch { return null; }
    if (!event || typeof event !== "object") return null;
    if (event.type === "complete" && (!event.task?.id || !["succeeded", "waiting_for_approval"].includes(event.task.status))) {
      throw new Error("The runtime did not confirm a successful task. Check run history before trying again.");
    }
    onEvent?.(event);
    if (event.type === "error") throw new Error(event.message || "Run failed.");
    return event.type === "complete" ? event.task : null;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const chunks = buffer.split(/\r?\n\r?\n/);
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const task = handle(chunk);
        if (task) return task;
      }
      if (done) {
        const task = handle(buffer);
        if (task) return task;
        throw new Error("Connection ended before the runtime confirmed the result. The task may still be active. Check run history before trying again; no automatic retry was made.");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
