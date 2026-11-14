import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headset, ShieldCheck } from 'lucide-react';
import RetailServiceAutomationSection from '@/components/retail/RetailServiceAutomationSection';
import { getReceptionistHubStatus } from '@/lib/retail/receptionist-hub.functions';

export default function AIReceptionistHub() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getReceptionistHubStatus({ data: {} })
      .then((result) => { if (active) setStatus(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Receptionist status is unavailable.'); });
    return () => { active = false; };
  }, []);

  return (
    <div className="blackstar-core-page space-y-6 pb-12">
      <section className="rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-8">
        <div className="flex items-center gap-2 text-violet-300"><Headset className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[.18em]">AI receptionist</span></div>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">Answer from the retail profile. Do not dial out from here.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Twilio readiness is read from the deployment configuration. Inbound and outbound carrier actions stay on the existing phone and retail voice surfaces, and only when those channels are configured.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link to="/phone-communications" className="rounded-xl border border-white/10 px-3 py-2 text-zinc-300">Phone and voice controls</Link>
          <Link to="/retail-hub" className="rounded-xl border border-white/10 px-3 py-2 text-zinc-300">Retail hub</Link>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-300/15 bg-rose-300/[.04] p-3 text-xs text-rose-100">{error}</p>}

      <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6" aria-label="Twilio readiness">
        <div className="flex items-center gap-2 text-emerald-200"><ShieldCheck className="h-4 w-4" /><h2 className="font-medium text-white">Carrier readiness</h2></div>
        {!status && !error && <p className="mt-3 text-xs text-zinc-500">Checking Twilio configuration…</p>}
        {status && (
          <>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-400">{status.notice}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {Object.entries(status.channels).map(([name, state]) => (
                <div key={name} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
                  <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{name}</p>
                  <p className={`mt-1 text-sm ${state === 'configured' ? 'text-emerald-200' : 'text-zinc-400'}`}>{state === 'configured' ? 'Configured' : 'Disabled'}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {status.accounts.map((account) => (
                <article key={account.id} className="rounded-xl border border-white/[.06] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm text-white">{account.account}</h3>
                    <span className="text-[10px] uppercase tracking-[.12em] text-zinc-500">{account.configured ? 'Present' : 'Missing'}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">{account.purpose}</p>
                  <p className="mt-2 font-mono text-[10px] text-zinc-600">{account.env.join(' · ')}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <RetailServiceAutomationSection />
    </div>
  );
}
