import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Nango from "@nangohq/frontend";
import {
  BookOpen,
  CheckCircle2,
  Github,
  LockKeyhole,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Unplug,
  Wrench,
} from "lucide-react";
import PageHeader from "@/components/palladium/PageHeader";
import {
  disconnectIntegration,
  listIntegrations,
  startIntegrationOAuth,
  testIntegrationConnection,
} from "@/lib/integrations/integrations.functions";
import { getGitHubConnection, startGitHubConnection } from "@/lib/integrations/github.functions";
import {
  getNangoGitHubConnection,
  startNangoGitHubConnection,
  testNangoGitHubConnection,
} from "@/lib/integrations/nango.functions";

const CATEGORY_LABELS = {
  productivity: "Productivity",
  communication: "Communication",
  crm: "CRM",
  project_management: "Project management",
  developer: "Developer tools",
};

function connectionHealthy(provider) {
  if (provider.nativeGitHub || provider.nangoGitHub)
    return provider.connection?.status === "connected";
  if (provider.connection?.health) return provider.connection.health.healthy === true;
  return provider.connection?.status === "connected";
}

function agentReady(provider) {
  return (
    provider.nativeGitHub ||
    provider.nangoGitHub ||
    (provider.tools ?? []).some((tool) =>
      [
        "connected_service",
        "connected_service_write",
        "email_draft",
        "email_send",
        "calendar",
        "slack_post",
      ].includes(tool),
    )
  );
}

export default function Integrations() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [catalogue, setCatalogue] = useState([]);
  const [github, setGithub] = useState(null);
  const [nangoGithub, setNangoGithub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState("");
  const [testResults, setTestResults] = useState({});
  const [error, setError] = useState("");
  const nangoConnectRef = useRef(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [integrationResult, githubResult, nangoResult] = await Promise.all([
        listIntegrations(),
        getGitHubConnection(),
        getNangoGitHubConnection().catch((err) => ({
          configured: true,
          connected: false,
          error: err instanceof Error ? err.message : "Could not load the Nango pilot state.",
        })),
      ]);
      setCatalogue(integrationResult.catalogue ?? []);
      setGithub(githubResult);
      setNangoGithub(nangoResult);
      return githubResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load integration state.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    const syncConnectionState = async () => {
      const params = new URLSearchParams(window.location.search);
      const githubReturned = params.get("integration_connected") === "github";
      const githubErrored = params.get("provider") === "github" && params.has("integration_error");
      let result = await refresh();

      if (!cancelled && githubReturned && !result?.connected) {
        retryTimer = window.setTimeout(async () => {
          if (cancelled) return;
          result = await refresh();
          if (!cancelled && result?.connected) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }, 500);
      } else if (!cancelled && (githubReturned || githubErrored)) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    const handlePageShow = () => {
      if (!cancelled) void refresh();
    };

    void syncConnectionState();
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelled = true;
      nangoConnectRef.current?.close();
      nangoConnectRef.current = null;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const providers = useMemo(() => {
    const githubProvider = {
      id: "github",
      name: "GitHub",
      category: "developer",
      summary:
        "Read selected repositories, branches, commits and bounded source files through a scoped GitHub App installation.",
      scopes: ["Metadata: read", "Contents: read"],
      tools: ["connected_service", "Code Explorer", "Version Control"],
      docsUrl: "https://docs.github.com/en/apps/creating-github-apps",
      configured: Boolean(github?.configured),
      nativeGitHub: true,
      connection: github?.connected
        ? {
            status: "connected",
            account_label: github.accountLabel,
            connected_at: github.connectedAt,
            last_error: github.lastError,
          }
        : github?.lastError
          ? {
              status: "error",
              account_label: github.accountLabel,
              connected_at: github.connectedAt,
              last_error: github.lastError,
            }
          : null,
    };
    const nangoGithubProvider = {
      id: "github-nango-pilot",
      name: "GitHub via Nango",
      category: "developer",
      summary:
        "Pilot Nango-managed GitHub authentication with Palladium user ownership tags and a server-side live API probe.",
      scopes: ["Pilot connection", "Credentials remain server-side"],
      tools: ["Nango Proxy", "GitHub health probe"],
      docsUrl: "https://nango.dev/docs/guides/auth/auth-guide",
      configured: Boolean(nangoGithub?.configured),
      nangoGitHub: true,
      pilot: true,
      supportsDisconnect: false,
      connection: nangoGithub?.connected
        ? {
            status: "connected",
            account_label: nangoGithub.accountLabel,
            connected_at: nangoGithub.createdAt,
          }
        : nangoGithub?.error
          ? {
              status: "error",
              last_error: nangoGithub.error,
            }
          : null,
    };
    return [...catalogue, githubProvider, nangoGithubProvider];
  }, [catalogue, github, nangoGithub]);

  const categories = useMemo(
    () => Array.from(new Set(providers.map((provider) => provider.category))).sort(),
    [providers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((provider) => {
      if (category !== "all" && provider.category !== category) return false;
      if (!q) return true;
      return [
        provider.name,
        provider.summary,
        ...(provider.tools ?? []),
        ...(provider.scopes ?? []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [providers, query, category]);

  const connectedCount = providers.filter(connectionHealthy).length;
  const configuredCount = providers.filter((provider) => provider.configured).length;
  const agentReadyCount = providers.filter(agentReady).length;

  async function connect(provider) {
    setBusyProvider(provider.id);
    setError("");
    try {
      if (provider.nangoGitHub) {
        nangoConnectRef.current?.close();
        const nango = new Nango();
        const connectUI = nango.openConnectUI({
          themeOverride: "dark",
          detectClosedAuthWindow: true,
          onEvent: async (event) => {
            if (event.type === "connect") {
              setTestResults((current) => ({
                ...current,
                [provider.id]: {
                  status: "success",
                  message: "GitHub connected through the Nango pilot.",
                },
              }));
              await refresh();
            } else if (event.type === "error") {
              setError(
                event.payload?.errorMessage || "The Nango connection could not be completed.",
              );
            }
            if (event.type === "connect" || event.type === "close" || event.type === "error") {
              setBusyProvider("");
            }
          },
        });
        nangoConnectRef.current = connectUI;
        connectUI.open();
        const result = await startNangoGitHubConnection();
        connectUI.setSessionToken(result.sessionToken);
        return;
      }
      if (provider.nativeGitHub) {
        const result = await startGitHubConnection({ data: { origin: window.location.origin } });
        window.location.assign(result.installUrl);
        return;
      }
      const result = await startIntegrationOAuth({
        data: { provider: provider.id, origin: window.location.origin },
      });
      window.location.assign(result.authorizeUrl);
    } catch (err) {
      if (provider.nangoGitHub) {
        nangoConnectRef.current?.close();
        nangoConnectRef.current = null;
      }
      setError(err instanceof Error ? err.message : `Could not connect ${provider.name}.`);
      setBusyProvider("");
    }
  }

  async function disconnect(provider) {
    setBusyProvider(provider.id);
    setError("");
    try {
      await disconnectIntegration({ data: { provider: provider.id } });
      setTestResults((current) => ({ ...current, [provider.id]: null }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not disconnect ${provider.name}.`);
    } finally {
      setBusyProvider("");
    }
  }

  async function testConnection(provider) {
    setBusyProvider(provider.id);
    setError("");
    setTestResults((current) => ({
      ...current,
      [provider.id]: { status: "testing", message: "Testing live provider access…" },
    }));
    try {
      const result = provider.nangoGitHub
        ? await testNangoGitHubConnection()
        : await testIntegrationConnection({ data: { provider: provider.id } });
      setTestResults((current) => ({
        ...current,
        [provider.id]: { status: "success", message: result.message, checkedAt: result.checkedAt },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : `Could not verify ${provider.name}.`;
      setTestResults((current) => ({ ...current, [provider.id]: { status: "error", message } }));
    } finally {
      setBusyProvider("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Integrations"
        description="Connect real services to PalladiumAI, verify them live, and expose only server-backed capabilities to your agents. Credentials and tokens remain server-side."
        action={
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => navigate("/developer-portal")}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
            >
              <BookOpen className="h-4 w-4" />
              API documentation
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/[.06] p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.045] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-emerald-100">Live connection backend</p>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-zinc-400">
              PalladiumAI checks persisted OAuth status, granted permissions and refresh capability.
              Connected cards can also run a bounded read-only provider test, so a green connection
              means the external API actually responded—not merely that a token row exists.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Provider adapters" value={providers.length} icon={Wrench} />
        <Metric label="Agent-ready" value={agentReadyCount} icon={ShieldCheck} />
        <Metric label="Configured" value={configuredCount} icon={CheckCircle2} />
        <Metric label="Healthy connections" value={connectedCount} icon={Plug} />
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search integrations, agent tools or permissions…"
            className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
          />
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-xl border border-white/10 bg-[#0b0c12] px-3 py-2.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {CATEGORY_LABELS[item] || item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-500">
          Loading persisted integration state…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-500">
          No integration adapters match this search.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              busy={busyProvider === provider.id}
              testResult={testResults[provider.id]}
              onConnect={() => connect(provider)}
              onDisconnect={() => disconnect(provider)}
              onTest={() => testConnection(provider)}
              onOpenGitHub={() => navigate("/code-explorer")}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ProviderCard({
  provider,
  busy,
  testResult,
  onConnect,
  onDisconnect,
  onTest,
  onOpenGitHub,
}) {
  const status = provider.connection?.status ?? "disconnected";
  const reconnectRequired = provider.connection?.health?.reconnectRequired === true;
  const connected = connectionHealthy(provider);
  const errored = status === "error";
  const rawConnected = status === "connected";
  const readyForAgents = agentReady(provider);
  const Icon = provider.nativeGitHub || provider.nangoGitHub ? Github : Plug;
  const healthReason = provider.connection?.health?.reason;
  const missingScopes = provider.connection?.health?.missingScopes ?? [];

  return (
    <article className="flex min-h-[21rem] flex-col rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
          <Icon className="h-5 w-5" />
        </span>
        <StatusBadge
          connected={connected}
          errored={errored}
          reconnectRequired={reconnectRequired}
          configured={provider.configured}
        />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            {CATEGORY_LABELS[provider.category] || provider.category}
          </p>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${readyForAgents ? "bg-cyan-400/10 text-cyan-300" : "bg-zinc-500/10 text-zinc-500"}`}
          >
            {readyForAgents ? "Agent ready" : "Account only"}
          </span>
          {provider.pilot && (
            <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-300">
              Pilot
            </span>
          )}
        </div>
        <h2 className="mt-1 text-base font-semibold text-white">{provider.name}</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{provider.summary}</p>
      </div>

      {(provider.tools ?? []).length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {provider.tools.slice(0, 5).map((tool) => (
            <span
              key={tool}
              className="rounded-lg bg-white/[.04] px-2 py-1 text-[10px] text-zinc-500"
            >
              {tool}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[10px] leading-4 text-zinc-600">
          No executable agent actions are advertised for this provider yet.
        </p>
      )}

      <div className="mt-auto pt-5">
        {rawConnected && provider.connection?.account_label && (
          <p className="mb-2 truncate text-[11px] text-emerald-300">
            Connected as {provider.connection.account_label}
          </p>
        )}
        {healthReason && reconnectRequired && (
          <p className="mb-2 text-[11px] leading-4 text-amber-300">{healthReason}</p>
        )}
        {missingScopes.length > 0 && (
          <p className="mb-2 text-[10px] leading-4 text-zinc-500">
            Missing permissions: {missingScopes.join(", ")}
          </p>
        )}
        {!reconnectRequired && provider.connection?.last_error && (
          <p className="mb-2 line-clamp-2 text-[11px] leading-4 text-red-300">
            {provider.connection.last_error}
          </p>
        )}
        {testResult && (
          <p
            className={`mb-2 rounded-lg px-2.5 py-2 text-[10px] leading-4 ${testResult.status === "success" ? "bg-emerald-500/[.06] text-emerald-300" : testResult.status === "error" ? "bg-red-500/[.06] text-red-300" : "bg-violet-500/[.06] text-violet-300"}`}
          >
            {testResult.message}
          </p>
        )}

        {!provider.configured ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[.05] px-3 py-2.5 text-xs text-amber-200/80">
              <LockKeyhole className="h-4 w-4 shrink-0" />
              OAuth app credentials required on the server
            </div>
            {provider.docsUrl && (
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-[10px] text-zinc-500 hover:text-violet-300"
              >
                Open provider setup documentation
              </a>
            )}
          </div>
        ) : connected ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              {provider.nativeGitHub && (
                <button
                  onClick={onOpenGitHub}
                  className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
                >
                  Open repositories
                </button>
              )}
              <button
                disabled={busy}
                onClick={onTest}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/20 px-3 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/[.06] disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {busy ? "Testing…" : "Test connection"}
              </button>
            </div>
            {provider.supportsDisconnect !== false && (
              <button
                disabled={busy}
                onClick={onDisconnect}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/15 px-3 py-2.5 text-xs font-medium text-red-300 hover:bg-red-500/[.06] disabled:opacity-50"
              >
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </button>
            )}
          </div>
        ) : reconnectRequired ? (
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={onConnect}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {busy ? "Opening provider…" : `Reconnect ${provider.name}`}
            </button>
            {rawConnected && (
              <button
                disabled={busy}
                onClick={onDisconnect}
                className="rounded-xl border border-red-400/15 px-3 py-2.5 text-xs font-medium text-red-300 hover:bg-red-500/[.06] disabled:opacity-50"
              >
                <Unplug className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            disabled={busy}
            onClick={onConnect}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
          >
            <Plug className="h-3.5 w-3.5" />
            {busy ? "Opening provider…" : `Connect ${provider.name}`}
          </button>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ connected, errored, reconnectRequired, configured }) {
  if (!configured)
    return (
      <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">
        Setup required
      </span>
    );
  if (reconnectRequired)
    return (
      <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">
        Reconnect required
      </span>
    );
  if (connected)
    return (
      <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
        Connected
      </span>
    );
  if (errored)
    return (
      <span className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-300">
        Needs attention
      </span>
    );
  return (
    <span className="rounded-lg bg-zinc-500/10 px-2 py-1 text-[10px] font-medium text-zinc-400">
      Disconnected
    </span>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-semibold text-white">{value}</p>
        <p className="text-[10px] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
