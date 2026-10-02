type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

export const BLACKSTAR_PRODUCTION_SUPABASE_PROJECT_REF = "piwhiuangitqvwvwwcga";

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function validProjectRef(value: string | undefined): string | null {
  const ref = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9]{8,64}$/.test(ref) ? ref : null;
}

export function projectRefFromSupabaseUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const hostname = new URL(raw).hostname.toLowerCase();
    const suffix = ".supabase.co";
    if (!hostname.endsWith(suffix)) return null;
    return validProjectRef(hostname.slice(0, -suffix.length));
  } catch {
    return null;
  }
}

export function resolveMcpSupabaseProjectRef(input: {
  explicitProjectRef?: string;
  supabaseUrl?: string;
  fallbackProjectRef?: string;
}) {
  const explicit = validProjectRef(input.explicitProjectRef);
  if (explicit) return explicit;

  const fromUrl = projectRefFromSupabaseUrl(input.supabaseUrl);
  if (fromUrl) return fromUrl;

  const fallback = validProjectRef(
    input.fallbackProjectRef ?? BLACKSTAR_PRODUCTION_SUPABASE_PROJECT_REF,
  );
  if (!fallback) throw new Error("Blackstar MCP Supabase project ref is invalid.");
  return fallback;
}

export function runtimeMcpSupabaseProjectRef() {
  return resolveMcpSupabaseProjectRef({
    explicitProjectRef:
      import.meta.env["VITE_SUPABASE_PROJECT_ID"] ??
      runtimeEnv("SUPABASE_PROJECT_ID"),
    supabaseUrl:
      import.meta.env["VITE_SUPABASE_URL"] ??
      runtimeEnv("SUPABASE_URL"),
    fallbackProjectRef: BLACKSTAR_PRODUCTION_SUPABASE_PROJECT_REF,
  });
}
