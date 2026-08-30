import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { transcribeOpenAiSpeech } from "@/lib/voice/voice-runtime.server";

type Sb = { from: (t: string) => any };

export type VoiceAssistantPreferences = {
  enabled: boolean;
  muted: boolean;
  voice_name: string | null;
  rate: number;
  pitch: number;
  announce_notifications: boolean;
  wake_word_enabled: boolean;
};

export const DEFAULT_VOICE_ASSISTANT_PREFERENCES: VoiceAssistantPreferences = {
  enabled: true,
  muted: false,
  voice_name: null,
  rate: 1,
  pitch: 1,
  announce_notifications: true,
  wake_word_enabled: false,
};

const preferenceSchema = z.object({
  enabled: z.boolean(),
  muted: z.boolean(),
  voice_name: z.string().trim().max(160).nullable(),
  rate: z.number().min(0.7).max(1.4),
  pitch: z.number().min(0.7).max(1.3),
  announce_notifications: z.boolean(),
  wake_word_enabled: z.boolean(),
});

const assistantAudioMime = z.enum([
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
]);

export const getVoiceAssistantPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VoiceAssistantPreferences> => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("voice_assistant_preferences")
      .select("enabled,muted,voice_name,rate,pitch,announce_notifications,wake_word_enabled")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return DEFAULT_VOICE_ASSISTANT_PREFERENCES;
    return {
      enabled: data.enabled ?? true,
      muted: data.muted ?? false,
      voice_name: data.voice_name ?? null,
      rate: Number(data.rate ?? 1),
      pitch: Number(data.pitch ?? 1),
      announce_notifications: data.announce_notifications ?? true,
      wake_word_enabled: data.wake_word_enabled ?? false,
    };
  });

export const saveVoiceAssistantPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => preferenceSchema.parse(input))
  .handler(async ({ data, context }): Promise<VoiceAssistantPreferences> => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      user_id: context.userId,
      ...data,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb
      .from("voice_assistant_preferences")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return data;
  });

/**
 * Low-latency STT lane used only by the ambient assistant. The audio is sent
 * directly to the configured OpenAI-compatible transcription endpoint and is
 * never inserted into Voice Studio jobs or persisted by PalladiumAI.
 */
export const transcribeVoiceAssistantAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    audioBase64: z.string().min(100).max(8_000_000),
    filename: z.string().trim().min(1).max(120).default("assistant.webm"),
    mimeType: assistantAudioMime,
    language: z.string().trim().min(2).max(20).default("en"),
  }).parse(input))
  .handler(async ({ data }) => {
    const result = await transcribeOpenAiSpeech({
      base64: data.audioBase64,
      filename: data.filename,
      mimeType: data.mimeType,
      language: data.language,
      prompt: "Short hands-free command or conversational request to the PalladiumAI assistant.",
    });
    return { text: result.text.trim(), model: result.model };
  });

export const getVoiceWorkspaceBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const [agentsRes, tasksRes, workflowsRes, notificationsRes] = await Promise.all([
      sb.from("personal_agents").select("id,name,status").eq("user_id", userId).limit(200),
      sb.from("agent_tasks").select("id,title,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      sb.from("workflow_runs").select("id,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      sb.from("notifications").select("id,title,severity,read_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    ]);

    for (const result of [agentsRes, tasksRes, workflowsRes, notificationsRes]) {
      if (result.error) throw new Error(result.error.message);
    }

    const agents = agentsRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const workflows = workflowsRes.data ?? [];
    const notifications = notificationsRes.data ?? [];
    return {
      activeAgents: agents.filter((a: any) => a.status === "active").map((a: any) => ({ id: a.id, name: a.name })),
      runningTasks: tasks.filter((t: any) => t.status === "running").map((t: any) => ({ id: t.id, title: t.title || "Untitled task" })),
      queuedTasks: tasks.filter((t: any) => t.status === "pending").length,
      runningWorkflows: workflows.filter((w: any) => ["running", "waiting_for_approval"].includes(w.status)).length,
      failedTasks: tasks.filter((t: any) => t.status === "failed").slice(0, 5).map((t: any) => ({ id: t.id, title: t.title || "Untitled task" })),
      unreadNotifications: notifications.filter((n: any) => !n.read_at).map((n: any) => ({ id: n.id, title: n.title, severity: n.severity })),
    };
  });
