import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { featureForPath } from "./route-features";

const LaunchAccessContext = createContext({ loading: true, isAdmin: false, visibleFeatures: [], canAccessPath: () => false });
export function LaunchAccessProvider({ children }) {
  const [state, setState] = useState({ loading: true, isAdmin: false, visibleFeatures: [] });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) { if (active) setState({ loading: false, isAdmin: false, visibleFeatures: ["landing", "authentication", "dashboard"] }); return; }
        const response = await fetch("/api/launch/access", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!response.ok) throw new Error("Launch access could not be verified.");
        const result = await response.json();
        if (active) setState({ loading: false, isAdmin: Boolean(result.isAdmin), visibleFeatures: Array.isArray(result.visibleFeatures) ? result.visibleFeatures : [] });
      } catch {
        if (active) setState({ loading: false, isAdmin: false, visibleFeatures: ["dashboard"] });
      }
    })();
    return () => { active = false; };
  }, []);
  const value = useMemo(() => ({
    ...state,
    canAccessPath(pathname) {
      if (state.isAdmin) return true;
      const feature = featureForPath(pathname);
      return Boolean(feature && state.visibleFeatures.includes(feature));
    },
  }), [state]);
  return <LaunchAccessContext.Provider value={value}>{children}</LaunchAccessContext.Provider>;
}
export const useLaunchAccess = () => useContext(LaunchAccessContext);

export function ComingSoon({ feature }) {
  return <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-6 text-center">
    <div className="mb-5 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-xs uppercase tracking-[.2em] text-violet-200">Blackstar · Coming soon</div>
    <h1 className="text-3xl font-semibold text-white">This capability is not available yet.</h1>
    <p className="mt-3 text-sm leading-6 text-zinc-400">{feature ? `${feature} is currently being prepared for a future release.` : "This area is not part of the current pilot release."} Your account and existing work are unaffected.</p>
    <a href="/dashboard" className="mt-7 rounded-xl border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/5">Return to dashboard</a>
  </section>;
}
