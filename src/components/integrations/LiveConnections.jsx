import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plug, ShieldCheck, Link2, Unlink, AlertTriangle, Loader2, ExternalLink, KeyRound } from 'lucide-react';
import { listIntegrations, startIntegrationOAuth, disconnectIntegration } from '@/lib/integrations/integrations.functions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const CATEGORY_LABEL = {
  productivity: 'Productivity',
  communication: 'Communication',
  crm: 'CRM',
  project_management: 'Project management',
  calendar: 'Calendar',
  email: 'Email',
};

const STATUS_STYLE = {
  connected: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  error: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
  disconnected: 'border-white/10 bg-white/5 text-zinc-400',
};

function scopeLabel(scope) {
  const tail = scope.split('/').pop() || scope;
  return tail.replace(/[._]/g, ' ');
}

export default function LiveConnections() {
  const { toast } = useToast();
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); setError('Sign in to manage integrations.'); return; }
    try {
      const res = await listIntegrations({ data: {} });
      setCatalogue(res.catalogue || []);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Could not load your connections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Surface the outcome of the OAuth round-trip, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('integration_connected');
    const failed = params.get('integration_error');
    if (!connected && !failed) return;
    if (connected) toast({ title: 'Integration connected', description: `${connected} is now authorised for your agents.` });
    if (failed) toast({ title: 'Connection failed', description: failed, variant: 'destructive' });
    window.history.replaceState({}, '', window.location.pathname);
  }, [toast]);

  const connect = async (provider) => {
    setBusy(provider.id);
    try {
      const { authorizeUrl } = await startIntegrationOAuth({ data: { provider: provider.id, origin: window.location.origin } });
      window.location.href = authorizeUrl;
    } catch (e) {
      toast({ title: `${provider.name} unavailable`, description: e?.message, variant: 'destructive' });
      setBusy(null);
    }
  };

  const disconnect = async (provider) => {
    setBusy(provider.id);
    try {
      await disconnectIntegration({ data: { provider: provider.id } });
      toast({ title: `${provider.name} disconnected`, description: 'Stored access tokens were destroyed.' });
      await load();
    } catch (e) {
      toast({ title: 'Disconnect failed', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Plug className="h-4 w-4 text-white" /></span>
            Account connections
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-zinc-400">
            Authorised with OAuth only. PalladiumAI never stores a password for another service, and access tokens are encrypted server-side — they are never sent to this browser.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Tokens encrypted at rest
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading your connections…</div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && (
        <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogue.map((provider) => {
            const conn = provider.connection;
            const status = provider.configured ? (conn?.status || 'disconnected') : 'unavailable';
            const isConnected = status === 'connected';
            const working = busy === provider.id;
            return (
              <div key={provider.id} className="flex flex-col rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{provider.name}</p>
                    <p className="text-[11px] text-zinc-500">{CATEGORY_LABEL[provider.category] || provider.category}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] capitalize ${STATUS_STYLE[status] || 'border-white/10 bg-white/5 text-zinc-400'}`}>
                    {status === 'unavailable' ? 'needs credentials' : status}
                  </span>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-zinc-400">{provider.summary}</p>

                {conn?.account_label && isConnected && (
                  <p className="mb-2 truncate text-[11px] text-zinc-300">Account: <span className="text-zinc-400">{conn.account_label}</span></p>
                )}
                {conn?.last_error && status === 'error' && (
                  <p className="mb-2 text-[11px] text-rose-300">{conn.last_error}</p>
                )}

                <div className="mb-3 flex flex-wrap gap-1">
                  {(isConnected && conn?.granted_scopes?.length ? conn.granted_scopes : provider.scopes).slice(0, 4).map((scope) => (
                    <span key={scope} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{scopeLabel(scope)}</span>
                  ))}
                  {!provider.scopes.length && !isConnected && (
                    <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">workspace access</span>
                  )}
                </div>

                <p className="mb-3 text-[11px] text-zinc-500">Powers: {provider.tools.join(', ')}</p>

                <div className="mt-auto flex items-center gap-2">
                  {status === 'unavailable' ? (
                    <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5">
                      <KeyRound className="h-3.5 w-3.5" /> Add OAuth client
                    </a>
                  ) : isConnected ? (
                    <button onClick={() => disconnect(provider)} disabled={working} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">
                      {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />} Disconnect
                    </button>
                  ) : (
                    <button onClick={() => connect(provider)} disabled={working} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-violet-600 disabled:opacity-50">
                      {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} Connect with OAuth
                    </button>
                  )}
                  <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="ml-auto text-zinc-500 hover:text-zinc-300"><ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
