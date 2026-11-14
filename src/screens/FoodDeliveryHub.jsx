import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldAlert, UtensilsCrossed } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { getFoodDeliveryHub, previewFoodDeliveryAction } from '@/lib/food-delivery/food-delivery.functions';

const inputClass = 'mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40';

export default function FoodDeliveryHub() {
  const loadHub = useServerFn(getFoodDeliveryHub);
  const preview = useServerFn(previewFoodDeliveryAction);
  const [countryCode, setCountryCode] = useState('GB');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [status, setStatus] = useState(null);
  const [refusal, setRefusal] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function checkCoverage(event) {
    event.preventDefault();
    setBusy('coverage');
    setError('');
    setRefusal(null);
    try {
      setStatus(await loadHub({ data: { countryCode, deliveryAddress } }));
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : 'Food delivery coverage could not be checked.');
    } finally {
      setBusy('');
    }
  }

  async function confirmBlocked() {
    setBusy('order');
    setError('');
    try {
      setRefusal(await preview({ data: { capability: 'consumer.order_create' } }));
    } catch (cause) {
      setRefusal(null);
      setError(cause instanceof Error ? cause.message : 'The order boundary could not be checked.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="blackstar-core-page space-y-6 pb-12">
      <section className="rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-8">
        <div className="flex items-center gap-2 text-violet-300"><UtensilsCrossed className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[.18em]">Food delivery</span></div>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">See which delivery partners can actually be used.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Coverage follows the contracted country list and server-side credentials. This hub never places an order, changes a menu, or creates a courier job.</p>
      </section>

      <form onSubmit={checkCoverage} className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
        <div className="flex items-center gap-2 text-cyan-200"><MapPin className="h-4 w-4" /><h2 className="font-medium text-white">Delivery area</h2></div>
        <div className="mt-4 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-end">
          <label className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Country
            <input aria-label="Delivery country code" value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} maxLength={2} className={inputClass} />
          </label>
          <label className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Address
            <input aria-label="Delivery address" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Optional street address" className={inputClass} />
          </label>
          <button type="submit" disabled={busy === 'coverage' || countryCode.trim().length !== 2} className="rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">{busy === 'coverage' ? 'Checking…' : 'Check coverage'}</button>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-zinc-600">A country alone can show adapter status. An address is recorded as your destination and is still not sent to a provider.</p>
      </form>

      {error && <p role="alert" className="rounded-xl border border-rose-300/15 bg-rose-300/[.04] p-3 text-xs text-rose-100">{error}</p>}

      {status && (
        <section className="space-y-3" aria-live="polite">
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-2 text-xs leading-5 text-amber-50"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{status.orderableDestination ? 'Address captured locally.' : 'Country-only view. This is not an order destination.'} Provider contact: {status.contactsProviders ? 'open' : 'closed'}.</span></p>
            <button type="button" onClick={confirmBlocked} disabled={busy === 'order'} className="rounded-xl border border-amber-200/20 px-3 py-2 text-xs text-amber-50 disabled:opacity-40">{busy === 'order' ? 'Checking…' : 'Confirm an order will not be placed'}</button>
          </div>
          {refusal && <p role="status" className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-zinc-300">{refusal.reason}</p>}
          <div className="grid gap-3 lg:grid-cols-3">
            {status.providers.map((provider) => (
              <article key={provider.id} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-white">{provider.displayName}</h3>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[.12em] text-zinc-400">{provider.executable ? 'Ready' : 'Blocked'}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{provider.reason}</p>
                <dl className="mt-3 space-y-1 text-[11px] text-zinc-400">
                  <div className="flex justify-between gap-3"><dt>Credentials</dt><dd>{provider.credentialsConfigured ? 'Present' : 'Missing'}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Country coverage</dt><dd>{provider.geographicallyEligible ? 'Declared' : 'Not contracted'}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Capabilities</dt><dd>{provider.capabilities.length}</dd></div>
                </dl>
                {provider.requiredAccount && (
                  <div className="mt-3 rounded-xl border border-white/[.06] bg-black/20 p-3 text-[11px] leading-5 text-zinc-500">
                    <p className="text-zinc-300">{provider.requiredAccount.account}</p>
                    <p className="mt-1">{provider.requiredAccount.contract}</p>
                    <p className="mt-1 font-mono text-[10px] text-zinc-600">{provider.requiredAccount.env.join(' · ')}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-zinc-500">Retail orders that already live in Blackstar stay in <Link to="/retail-hub" className="text-violet-300">Retail Hub</Link>. Food-provider writes stay closed until a partner contract and certified adapter exist.</p>
    </div>
  );
}
