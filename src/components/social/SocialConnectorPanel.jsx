import { useEffect, useMemo, useRef, useState } from "react";
import Nango from "@nangohq/frontend";
import { CheckCircle2, ExternalLink, Plug, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import {
  disconnectIntegration,
  listIntegrations,
  startIntegrationOAuth,
  testIntegrationConnection,
} from "@/lib/integrations/integrations.functions";
import {
  disconnectNangoConnection,
  listNangoConnections,
  startNangoConnection,
  testNangoConnection,
} from "@/lib/integrations/nango.functions";

const SOCIAL_TERMS = [
  "instagram", "facebook", "tiktok", "linkedin", "youtube", "twitter", "threads",
  "pinterest", "bluesky", "mastodon", "discord", "telegram", " x ", "x.com", "meta",
];

function isSocialProvider(provider) {
  const haystack = ` ${String(provider?.id || provider?.providerId || "").toLowerCase()} ${String(provider?.name || "").toLowerCase()} `;
  return SOCIAL_TERMS.some((term) => haystack.includes(term));
}

function healthy(provider) {
  if (provider.nangoProvider) return provider.connected === true;
  if (provider.connection?.health) return provider.connection.health.healthy === true;
  return provider.connection?.status === "connected";
}

function nativeCoverage(providerId) {
  const id = String(providerId || "").toLowerCase();
  return id === "meta" ? ["facebook", "instagram", "meta"] : [id];
}

export default function SocialConnectorPanel({ onConnectionsChanged }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [testResults, setTestResults] = useState({});
  const nangoConnectRef = useRef(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [nativeResult, nangoResult] = await Promise.all([
        listIntegrations(),
        listNangoConnections().catch(() => []),
      ]);
      const nativeProviders = (nativeResult?.catalogue ?? [])
        .filter(isSocialProvider)
        .map((provider) => ({ ...provider, providerId: provider.id, nangoProvider: false }));
      const nativeCovered = new Set(nativeProviders.flatMap((provider) => nativeCoverage(provider.providerId)));
      const nangoProviders = (nangoResult ?? [])
        .filter(isSocialProvider)
        .map((provider) => ({
          ...provider,
          providerId: provider.id,
          id: `${provider.id}-nango`,
          nangoProvider: true,
          fallbackOnly: nativeCovered.has(String(provider.id || "").toLowerCase()),
        }));
      setProviders([...nativeProviders, ...nangoProviders]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load social account connectors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const handlePageShow = () => void refresh();
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      nangoConnectRef.current?.close();
      nangoConnectRef.current = null;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const connectedCount = useMemo(() => providers.filter(healthy).length, [providers]);

  async function connect(provider) {
    setBusy(provider.id);
    setError("");
    try {
      if (provider.nangoProvider) {
        nangoConnectRef.current?.close();
        const nango = new Nango();
        const connectUI = nango.openConnectUI({
          themeOverride: "dark",
          detectClosedAuthWindow: true,
          onEvent: async (event) => {
            if (event.type === "connect") {
              setTestResults((current) => ({ ...current, [provider.id]: { ok: true, message: `${provider.name} fallback connected.` } }));
              await refresh();
              await onConnectionsChanged?.();
            } else if (event.type === "error") {
              setError(event.payload?.errorMessage || `Could not connect ${provider.name}.`);
            }
            if (["connect", "close", "error"].includes(event.type)) setBusy("");
          },
        });
        nangoConnectRef.current = connectUI;
        connectUI.open();
        const result = await startNangoConnection({ data: { provider: provider.providerId } });
        connectUI.setSessionToken(result.sessionToken);
        return;
      }
      const result = await startIntegrationOAuth({
        data: { provider: provider.providerId, origin: window.location.origin },
      });
      window.location.assign(result.authorizeUrl);
    } catch (err) {
      nangoConnectRef.current?.close();
      nangoConnectRef.current = null;
      setBusy("");
      setError(err instanceof Error ? err.message : `Could not connect ${provider.name}.`);
    }
  }

  async function disconnect(provider) {
    setBusy(provider.id);
    setError("");
    try {
      if (provider.nangoProvider) await disconnectNangoConnection({ data: { provider: provider.providerId } });
      else await disconnectIntegration({ data: { provider: provider.providerId } });
      setTestResults((current) => ({ ...current, [provider.id]: null }));
      await refresh();
      await onConnectionsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not disconnect ${provider.name}.`);
    } finally {
      setBusy("");
    }
  }

  async function test(provider) {
    setBusy(provider.id);
    setError("");
    try {
      const result = provider.nangoProvider
        ? await testNangoConnection({ data: { provider: provider.providerId } })
        : await testIntegrationConnection({ data: { provider: provider.providerId } });
      setTestResults((current) => ({ ...current, [provider.id]: { ok: true, message: result.message } }));
      await onConnectionsChanged?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Could not test ${provider.name}.`;
      setTestResults((current) => ({ ...current, [provider.id]: { ok: false, message } }));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-violet-400/15 bg-violet-500/[.035] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><Plug className="h-5 w-5 text-violet-300" /><h2 className="font-semibold text-white">Social media accounts</h2></div>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-400">Connect social accounts through Blackstar's native OAuth integrations first. Provider tokens remain encrypted and server-side. Optional connector fallbacks are retained only where they add coverage or resilience.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Refresh accounts</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">{connectedCount} connected</span>
        <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-zinc-400">{providers.length} social connectors available</span>
        <span className="flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-200"><ShieldCheck className="h-3 w-3" />Credentials remain server-side</span>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[.06] p-3 text-xs text-red-200">{error}</div>}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => {
          const isConnected = healthy(provider);
          const result = testResults[provider.id];
          const isBusy = busy === provider.id;
          return (
            <article key={provider.id} className={`rounded-xl border bg-black/20 p-4 ${provider.fallbackOnly ? "border-white/[.06] opacity-80" : "border-white/10"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><h3 className="truncate text-sm font-medium text-white">{provider.name}</h3>{isConnected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />}</div>
                  <p className="mt-1 text-[11px] text-zinc-500">{provider.nangoProvider ? (provider.fallbackOnly ? "Optional fallback connector" : "Connector transport") : "Native OAuth · preferred"}{provider.accountLabel || provider.connection?.account_label ? ` · ${provider.accountLabel || provider.connection?.account_label}` : ""}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${isConnected ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-zinc-500"}`}>{isConnected ? "connected" : "not connected"}</span>
              </div>
              {provider.nangoProvider && provider.capabilityCount > 0 && <p className="mt-3 text-xs text-zinc-400">{provider.capabilityCount} live actions · {provider.approvalActionCount ?? 0} approval-gated</p>}
              {provider.fallbackOnly && <p className="mt-3 text-[11px] leading-4 text-zinc-500">Blackstar has a native integration for this network. Use this connector only when the native route is unavailable or does not yet cover the required action.</p>}
              {result && <p className={`mt-3 text-xs ${result.ok ? "text-emerald-300" : "text-red-300"}`}>{result.message}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {!isConnected ? (
                  <button onClick={() => connect(provider)} disabled={isBusy || provider.configured === false} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40">{isBusy ? "Connecting…" : provider.fallbackOnly ? "Connect fallback" : "Connect account"}</button>
                ) : (
                  <>
                    <button onClick={() => test(provider)} disabled={isBusy} className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-40">Test connection</button>
                    <button onClick={() => disconnect(provider)} disabled={isBusy} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 disabled:opacity-40"><Unplug className="h-3 w-3" />Disconnect</button>
                  </>
                )}
                {provider.docsUrl && <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300">Docs<ExternalLink className="h-3 w-3" /></a>}
              </div>
              {provider.configured === false && <p className="mt-3 text-[11px] leading-4 text-amber-200">This native connector needs workspace OAuth/provider configuration before users can connect accounts.</p>}
            </article>
          );
        })}
        {!loading && !providers.length && <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">No social connectors are currently configured in the Blackstar integration catalogue.</div>}
      </div>
    </section>
  );
}
