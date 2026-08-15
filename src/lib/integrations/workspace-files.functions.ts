import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readGoogleDriveFile, searchGoogleDriveFiles } from "./google-workspace.server";
import { readMicrosoftOneDriveFile, searchMicrosoftOneDriveFiles } from "./microsoft365.server";

type Sb = { from: (t: string) => any };
type FileProvider = "google" | "microsoft";

async function resolveFileProvider(sb: Sb, userId: string, requested?: string | null): Promise<FileProvider> {
  const { data, error } = await sb
    .from("integrations")
    .select("provider,status,connected_at")
    .eq("user_id", userId)
    .in("provider", ["google", "microsoft"])
    .eq("status", "connected")
    .order("connected_at", { ascending: false });
  if (error) throw new Error(error.message);
  const providers = (data ?? [])
    .map((row: any) => row.provider)
    .filter((provider: unknown): provider is FileProvider => provider === "google" || provider === "microsoft");
  if ((requested === "google" || requested === "microsoft") && providers.includes(requested)) return requested;
  const provider = providers[0];
  if (!provider) throw new Error("Connect Google Workspace or Microsoft 365 to read workspace files");
  return provider;
}

export const searchConnectedWorkspaceFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; provider?: FileProvider; limit?: number }) => {
    const query = String(input?.query ?? "").trim().slice(0, 200);
    if (!query) throw new Error("A file search query is required");
    return {
      query,
      provider: input?.provider ?? null,
      limit: Math.min(Math.max(Number(input?.limit ?? 10) || 10, 1), 50),
    };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const provider = await resolveFileProvider(sb, context.userId, data.provider);
    if (provider === "microsoft") {
      return { provider, files: await searchMicrosoftOneDriveFiles({ userId: context.userId, query: data.query, limit: data.limit }) };
    }
    return { provider, files: await searchGoogleDriveFiles({ userId: context.userId, query: data.query, limit: data.limit }) };
  });

export const readConnectedWorkspaceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileId: string; provider?: FileProvider; mimeType?: string | null }) => {
    const fileId = String(input?.fileId ?? "").trim().slice(0, 300);
    if (!fileId) throw new Error("A file id is required");
    return {
      fileId,
      provider: input?.provider ?? null,
      mimeType: typeof input?.mimeType === "string" ? input.mimeType.slice(0, 200) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const provider = await resolveFileProvider(sb, context.userId, data.provider);
    if (provider === "microsoft") {
      return { provider, ...(await readMicrosoftOneDriveFile({ userId: context.userId, fileId: data.fileId })) };
    }
    return {
      provider,
      ...(await readGoogleDriveFile({ userId: context.userId, fileId: data.fileId, mimeType: data.mimeType })),
    };
  });
