/**
 * Client-side access to the authoritative workspace state.
 *
 * The server decides the plan, limits, usage and role — this hook only caches
 * what the backend returns. Never derive permissions from local state.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSessionReady } from "@/lib/useSessionReady";
import { getWorkspace } from "@/lib/platform/platform.functions";

const ACTIVE_ORG_KEY = "palladium.activeOrg";

function withWorkspaceTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Workspace state did not respond within 15 seconds.")), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export function useSession() {
  return useSessionReady();
}

export function useActiveOrg() {
  const [orgId, setOrgId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrgId(window.localStorage.getItem(ACTIVE_ORG_KEY));
  }, []);
  const select = (id: string | null) => {
    setOrgId(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(ACTIVE_ORG_KEY, id);
    else window.localStorage.removeItem(ACTIVE_ORG_KEY);
  };
  return { orgId, select };
}

export function useWorkspace() {
  const session = useSession();
  const { orgId, select } = useActiveOrg();
  const workspaceFn = useServerFn(getWorkspace);

  const query = useQuery({
    queryKey: ["workspace", orgId],
    queryFn: () => withWorkspaceTimeout(workspaceFn({ data: { orgId } })),
    enabled: session === "yes",
    retry: false,
    staleTime: 30_000,
  });

  return {
    session,
    activeOrgId: query.data?.activeOrgId ?? null,
    selectOrg: select,
    organisations: query.data?.organisations ?? [],
    entitlements: query.data?.entitlements ?? null,
    profile: query.data?.profile ?? null,
    unreadNotifications: query.data?.unreadNotifications ?? 0,
    isLoading: query.isLoading && session === "yes",
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
