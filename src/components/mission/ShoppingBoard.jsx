import { ShoppingBag, Star, Truck, Store, ExternalLink, PackageSearch, CheckCircle2, ShieldCheck, Bookmark } from 'lucide-react';
import { formatMoney } from '@/lib/mission/catalog';

export default function ShoppingBoard({
  shoppingResults = [],
  purchases = [],
  loading,
  onPrepare,
  onTrack,
  busyId,
}) {
  const grouped = shoppingResults.reduce((acc, r) => {
    const key = r.shopping_task_id;
    acc[key] = acc[key] ? [...acc[key], r] : [r];
    return acc;
  }, {});
  const groups = Object.entries(grouped);
  const actionable = Boolean(onPrepare || onTrack);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Shopping agent</h2>
        <p className="text-[11px] text-zinc-500">product comparison — purchases always need your approval</p>
      </div>


      {loading ? (
        <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
      ) : groups.length === 0 ? (
        <p className="text-xs text-zinc-600">No shopping research yet. Try “I need a new office chair under £250.”</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([taskId, rows]) => {
            const purchase = purchases.find((p) => p.shopping_task_id === taskId);
            return (
              <div key={taskId}>
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-600">
                  <PackageSearch className="h-3 w-3" />{rows.length} options compared
                  {purchase && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] normal-case tracking-normal ${purchase.status === 'checkout_ready' ? 'bg-emerald-500/15 text-emerald-300' : purchase.status === 'rejected' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>
                      {purchase.status === 'awaiting_approval' ? 'Status: awaiting approval' : `Status: ${purchase.status.replace(/_/g, ' ')}`}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[11px]">
                    <thead className="text-[10px] uppercase tracking-wider text-zinc-600">
                      <tr>
                        <th className="pb-2 pr-3 font-medium">Product</th>
                        <th className="pb-2 pr-3 font-medium">Price</th>
                        <th className="pb-2 pr-3 font-medium">Seller</th>
                        <th className="pb-2 pr-3 font-medium">Delivery</th>
                        <th className="pb-2 pr-3 font-medium">Rating</th>
                        <th className="pb-2 font-medium">Why</th>
                        {actionable && <th className="pb-2 font-medium">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className={`border-t border-white/5 ${r.selected ? 'bg-violet-500/[.06]' : ''}`}>
                          <td className="py-2 pr-3">
                            <span className="flex items-center gap-1.5 text-zinc-200">
                              {r.selected && <CheckCircle2 className="h-3 w-3 text-violet-400" />}{r.product}
                            </span>
                            {!r.in_stock && <span className="text-[10px] text-rose-300">Out of stock</span>}
                          </td>
                          <td className="py-2 pr-3 font-semibold text-white">{formatMoney(r.price, r.currency)}</td>
                          <td className="py-2 pr-3 text-zinc-400"><span className="inline-flex items-center gap-1"><Store className="h-3 w-3" />{r.seller}</span></td>
                          <td className="py-2 pr-3 text-zinc-400"><span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" />{r.delivery}</span></td>
                          <td className="py-2 pr-3 text-zinc-400"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{r.rating}</span></td>
                          <td className="py-2 text-zinc-500">
                            <span className="line-clamp-2">{r.reason}</span>
                            {r.url && <a href={r.url} target="_blank" rel="noreferrer noopener" className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-violet-300 hover:underline">View <ExternalLink className="h-2.5 w-2.5" /></a>}
                          </td>
                          {actionable && (
                            <td className="py-2">
                              <div className="flex items-center gap-1.5">
                                {onPrepare && (
                                  <button
                                    type="button"
                                    disabled={busyId === r.id || !r.in_stock}
                                    onClick={() => onPrepare(r)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200 disabled:opacity-40"
                                    title={r.in_stock ? 'Prepare this purchase for your approval' : 'Out of stock'}
                                  >
                                    <ShieldCheck className="h-3 w-3" />
                                    {busyId === r.id ? 'Preparing…' : 'Prepare'}
                                  </button>
                                )}
                                {onTrack && (
                                  <button
                                    type="button"
                                    onClick={() => onTrack(r)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/10"
                                    title="Track this product's price and availability"
                                  >
                                    <Bookmark className="h-3 w-3" />Track
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
