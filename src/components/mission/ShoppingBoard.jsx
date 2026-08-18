import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ShoppingBag, Star, Truck, Store, ExternalLink, PackageSearch, CheckCircle2, ShieldCheck, Bookmark, Image as ImageIcon } from 'lucide-react';
import { formatMoney } from '@/lib/mission/catalog';
import { getLatestVerifiedExplorerResults } from '@/lib/shopping/explorer.functions';

function ProductImage({ result }) {
  const src = result?.specs?.image_url || result?.specs?.imageUrl || null;
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/30">
      {src ? (
        <img src={src} alt={result.product || 'Product'} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2" />
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-700"><ImageIcon className="h-8 w-8" /></div>
      )}
      {result.selected && (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/90 px-2 py-1 text-[9px] font-semibold text-white">
          <CheckCircle2 className="h-3 w-3" />Recommended
        </span>
      )}
      {!result.in_stock && <span className="absolute right-2 top-2 rounded-full bg-rose-500/90 px-2 py-1 text-[9px] font-semibold text-white">Out of stock</span>}
    </div>
  );
}

export default function ShoppingBoard({
  loading,
  onPrepare,
  onTrack,
  busyId,
}) {
  const verifiedFn = useServerFn(getLatestVerifiedExplorerResults);
  const verifiedQuery = useQuery({
    queryKey: ['shopping-workspace', 'verified-products'],
    queryFn: () => verifiedFn({ data: {} }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const shoppingResults = verifiedQuery.data?.results ?? [];
  const purchases = verifiedQuery.data?.purchases ?? [];
  const latestTask = verifiedQuery.data?.task ?? null;
  const rejectedUnverified = verifiedQuery.data?.rejectedUnverified ?? 0;
  const grouped = shoppingResults.reduce((acc, r) => {
    const key = r.shopping_task_id;
    acc[key] = acc[key] ? [...acc[key], r] : [r];
    return acc;
  }, {});
  const groups = Object.entries(grouped);
  const actionable = Boolean(onPrepare || onTrack);
  const isLoading = loading || verifiedQuery.isLoading;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Live Explorer</h2>
        <p className="text-[11px] text-zinc-500">verified retailer product pages only — purchases always need your approval</p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-white/5" />)}</div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-medium text-zinc-300">
            {latestTask
              ? `No verified live products were found for “${latestTask.requirement}”.`
              : 'No live product search has been run yet.'}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
            Explorer will not recycle older or simulated cards. Only products confirmed on a live retailer product page with a usable image and direct product link are shown here.
            {rejectedUnverified > 0 ? ` ${rejectedUnverified} unverified candidate${rejectedUnverified === 1 ? '' : 's'} were hidden.` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([taskId, rows]) => {
            const purchase = purchases.find((p) => p.shopping_task_id === taskId);
            return (
              <section key={taskId}>
                <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-600">
                  <PackageSearch className="h-3 w-3" />{rows.length} verified live option{rows.length === 1 ? '' : 's'}
                  {purchase && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] normal-case tracking-normal ${purchase.status === 'checkout_ready' ? 'bg-emerald-500/15 text-emerald-300' : purchase.status === 'rejected' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>
                      {purchase.status === 'awaiting_approval' ? 'Status: awaiting approval' : `Status: ${purchase.status.replace(/_/g, ' ')}`}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {rows.map((r) => (
                    <article key={r.id} className={`flex flex-col rounded-2xl border p-3 ${r.selected ? 'border-violet-400/30 bg-violet-500/[.06]' : 'border-white/10 bg-black/20'}`}>
                      <ProductImage result={r} />
                      <div className="mt-3 flex min-h-0 flex-1 flex-col">
                        <h3 className="line-clamp-2 text-xs font-semibold leading-relaxed text-white">{r.product}</h3>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-base font-semibold text-white">{formatMoney(r.price, r.currency)}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200"><Star className="h-3 w-3" />{Number(r.rating || 0) > 0 ? r.rating : '—'}</span>
                        </div>
                        <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                          <p className="flex items-center gap-1.5"><Store className="h-3 w-3 shrink-0" />{r.seller}</p>
                          <p className="flex items-center gap-1.5"><Truck className="h-3 w-3 shrink-0" />{r.delivery || 'Check retailer for delivery'}</p>
                        </div>
                        {r.reason && <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-zinc-500">{r.reason}</p>}

                        <div className="mt-auto pt-3">
                          <a href={r.url} target="_blank" rel="noreferrer noopener" className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-2 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/15">
                            View real product on {r.seller || 'retailer'} <ExternalLink className="h-3 w-3" />
                          </a>
                          {actionable && (
                            <div className="grid grid-cols-2 gap-2">
                              {onPrepare && (
                                <button
                                  type="button"
                                  disabled={busyId === r.id || !r.in_stock}
                                  onClick={() => onPrepare(r)}
                                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-[10px] font-semibold text-amber-200 disabled:opacity-40"
                                  title={r.in_stock ? 'Prepare this purchase for your approval' : 'Out of stock'}
                                >
                                  <ShieldCheck className="h-3 w-3" />{busyId === r.id ? 'Preparing…' : 'Prepare'}
                                </button>
                              )}
                              {onTrack && (
                                <button type="button" onClick={() => onTrack(r)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/10" title="Track this product's price and availability">
                                  <Bookmark className="h-3 w-3" />Track
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
