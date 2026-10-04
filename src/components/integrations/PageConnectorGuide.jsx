import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, PlugZap, ShieldCheck, Sparkles } from "lucide-react";
import { pageConnectorRecommendations } from "@/lib/integrations/page-connector-map";

const STATE_LABELS = {
  native: "Native",
  supported: "Supported",
  target: "Connector target",
  candidate: "Candidate",
};

const STATE_CLASSES = {
  native: "border-emerald-400/15 bg-emerald-500/[.055] text-emerald-200",
  supported: "border-cyan-400/15 bg-cyan-500/[.05] text-cyan-200",
  target: "border-violet-400/15 bg-violet-500/[.055] text-violet-200",
  candidate: "border-white/[.08] bg-white/[.025] text-zinc-400",
};

export default function PageConnectorGuide({ pathname }) {
  const navigate = useNavigate();
  const connectors = useMemo(
    () => pageConnectorRecommendations(pathname, 7),
    [pathname],
  );

  if (connectors.length === 0) return null;

  return (
    <section
      className="mb-4 rounded-2xl border border-white/[.065] bg-black/20 px-3.5 py-3 backdrop-blur-xl sm:px-4"
      aria-label="Recommended connectors for this page"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-2.5 xl:w-[14rem] xl:shrink-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-violet-300/10 bg-violet-400/[.045] text-violet-200">
            <PlugZap className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-zinc-500">
              Page connectors
            </p>
            <p className="truncate text-[11px] text-zinc-600">
              Best-fit provider routes
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {connectors.map((connector) => (
            <span
              key={connector.id}
              title={connector.reason}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-medium ${STATE_CLASSES[connector.state]}`}
            >
              {connector.state === "candidate" ? (
                <Sparkles className="h-3 w-3 opacity-75" />
              ) : (
                <ShieldCheck className="h-3 w-3 opacity-75" />
              )}
              <span>{connector.name}</span>
              <span className="hidden opacity-55 sm:inline">
                · {STATE_LABELS[connector.state]}
              </span>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate("/integrations")}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl border border-violet-300/15 bg-violet-400/[.045] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-violet-200 hover:bg-violet-400/[.08] xl:self-center"
        >
          Manage connectors
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      {connectors.some((connector) => connector.state === "candidate") && (
        <p className="mt-2 border-t border-white/[.04] pt-2 text-[9px] leading-4 text-zinc-700">
          Candidate means the provider was found in the current ChatGPT connector catalogue and is a strong workflow match; it is not a Blackstar connection until a real provider API, MCP or OAuth route is configured and verified.
        </p>
      )}
    </section>
  );
}
