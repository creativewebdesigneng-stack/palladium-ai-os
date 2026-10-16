/**
 * Client helper for streaming agent runs.
 *
 * Talks to the same-origin `/api/agents/run` endpoint with the operator's
 * session token so the runtime can authenticate the caller. Server-side
 * failures are surfaced without silently retrying a side-effecting run.
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
    // An HTTP failure does not prove that a run was never started. Retrying
    // against a second execution path can repeat writes, purchases or messages.
    // Leave the user's task untouched and surface the original server error.
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let task = null;
  let terminalError = null;

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
      if (event.type === "error") terminalError = event.message || "The agent run failed.";
      onEvent?.(event);
    }
  }

  if (terminalError) throw new Error(terminalError);
  if (!task) {
    throw new Error("The agent connection ended before a completion result arrived. Check the model provider and preview runtime logs.");
  }
  if (!String(task.output_text ?? task.output?.text ?? "").trim()) {
    throw new Error("The agent completed without a final response. Tool activity alone is not a finished result.");
  }
  return task;
}
