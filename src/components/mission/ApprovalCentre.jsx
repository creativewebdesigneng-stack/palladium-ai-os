import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Check, X, Pencil, MessageSquare, Truck, Star, Store, Loader2, ExternalLink, Lock, RotateCcw, AlertTriangle } from 'lucide-react';
import { ACTION_TYPES, RISK_STYLE, formatMoney } from '@/lib/mission/catalog';

function PurchaseSummary({ purchase }) {
  if (!purchase) return null;
  const rows = [
    ['Item price', purchase.item_price],
    ['Delivery', purchase.delivery_cost],
    ['Tax included', purchase.tax],
    ['Fees', purchase.fees],
  ];
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Exactly what will be purchased</p>
      <p className="mt-1 text-xs font-semibold text-white">{purchase.product}</p>
      <p className="text-[11px] text-zinc-400">Seller: {purchase.seller}</p>
      <dl className="mt-2 space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-[11px]">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-zinc-300">{formatMoney(value, purchase.currency)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-white/10 pt-1 text-xs font-semibold">
          <dt className="text-white">Total</dt>
          <dd className="text-white">{formatMoney(purchase.total, purchase.currency)}</dd>
        </div>
      </dl>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500">
        <Lock className="h-3 w-3 text-emerald-400" /> Your agent has no access to cards or bank details. You complete payment at the seller.
      </p>
    </div>
  );
}

export default function ApprovalCentre({
  approvals = [], purchases = [], results = [], loading, busyId,
  onDecide, onRetry, onChooseAlternative, onConfirmPurchase, onAskAgent,
}) {
  const [openAlt, setOpenAlt] = useState(null);
  const pending = approvals.filter((a) => a.status === 'pending');
  const decided = approvals.filter((a) => a.status !== 'pending').slice(0, 8);

  const purchaseFor = (approvalId) => purchases.find((p) => p.approval_request_id === approvalId);
  const approvedReady = purchases.filter((p) => p.status === 'approved_awaiting_checkout');

  return (
    <div className="space-y-4">
      {approvedReady.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[.06] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Check className="h-4 w-4 text-emerald-400" />Approved — ready for secure checkout</h2>
          <div className="mt-3 space-y-3">
            {approvedReady.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-white">{p.product}</p>
                  <span className="text-[11px] text-zinc-400">· {p.seller}</span>
                  <span className="ml-auto text-sm font-semibold text-white">{formatMoney(p.total, p.currency)}</span>
                </div>
                <PurchaseSummary purchase={p} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onConfirmPurchase?.(p)}
                    disabled={busyId === p.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                  >
                    {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    Confirm & continue to checkout
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Approval centre</h2>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{pending.length} action{pending.length === 1 ? '' : 's'} required</span>
        </div>

        {loading ? (
          <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : pending.length === 0 ? (
          <p className="text-xs text-zinc-600">Nothing is waiting on you. Sensitive actions will queue here for approval.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((a, i) => {
              const risk = RISK_STYLE[a.risk_level] ?? RISK_STYLE.low;
              const purchase = purchaseFor(a.id);
              const alternatives = purchase
                ? results.filter((r) => r.shopping_task_id === purchase.shopping_task_id && r.id !== purchase.shopping_result_id)
                : [];
              return (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2) }}
                  className="rounded-xl border border-amber-400/20 bg-amber-500/[.04] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Action required</span>
                    <span className="text-[10px] text-zinc-500">{ACTION_TYPES[a.action_type] ?? a.action_type}</span>
                    <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${risk.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} />{risk.label}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-white">{a.title}</p>
                  {a.summary && <p className="mt-0.5 text-xs text-zinc-400">{a.summary}</p>}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                    {a.details?.seller && <span className="inline-flex items-center gap-1"><Store className="h-3 w-3" />{a.details.seller}</span>}
                    {a.details?.delivery && <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" />{a.details.delivery}</span>}
                    {a.details?.rating && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{a.details.rating}</span>}
                    {a.estimated_cost != null && <span className="font-semibold text-white">Estimated {formatMoney(a.estimated_cost, a.currency)}</span>}
                  </div>

                  <PurchaseSummary purchase={purchase} />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => onDecide?.(a, 'approve')} disabled={busyId === a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50">
                      {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Approve
                    </button>
                    <button onClick={() => onDecide?.(a, 'reject')} disabled={busyId === a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" />Reject
                    </button>
                    {alternatives.length > 0 && (
                      <button onClick={() => setOpenAlt(openAlt === a.id ? null : a.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5">
                        <Pencil className="h-3.5 w-3.5" />Choose another
                      </button>
                    )}
                    <button onClick={() => onAskAgent?.(a)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5">
                      <MessageSquare className="h-3.5 w-3.5" />Ask agent
                    </button>
                  </div>

                  {openAlt === a.id && (
                    <ul className="mt-3 space-y-2">
                      {alternatives.map((alt) => (
                        <li key={alt.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/25 p-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs text-white">{alt.product}</p>
                            <p className="text-[10px] text-zinc-500">{alt.seller} · {alt.delivery} · {alt.rating}★</p>
                          </div>
                          <span className="ml-auto text-xs font-semibold text-white">{formatMoney(alt.price, alt.currency)}</span>
                          <button
                            onClick={() => { onChooseAlternative?.(a, alt); setOpenAlt(null); }}
                            className="rounded-lg border border-violet-400/30 px-2.5 py-1 text-[11px] text-violet-200 transition hover:bg-violet-500/10"
                          >
                            Use this
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}

        {decided.length > 0 && (
          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">Recent decisions</p>
            <ul className="mt-2 space-y-2">
              {decided.map((d) => {
                const executionFailed = d.status === 'approved' && d.execution_status === 'failed';
                const executionSucceeded = d.execution_status === 'succeeded';
                return (
                  <li key={d.id} className={`rounded-lg border p-2.5 ${executionFailed ? 'border-rose-400/20 bg-rose-500/[.05]' : 'border-white/5 bg-black/15'}`}>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${executionFailed ? 'bg-rose-400' : d.status === 'approved' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="truncate text-zinc-300">{d.title}</span>
                      <span className="ml-auto text-zinc-600">
                        {executionFailed ? 'approved · action failed' : executionSucceeded ? 'approved · completed' : d.status}
                      </span>
                    </div>
                    {executionFailed && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="flex min-w-0 flex-1 items-start gap-1.5 text-[10px] text-rose-200/80">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{d.execution_error ?? 'The provider action failed. Reconnect the integration if its permissions changed, then retry.'}</span>
                        </p>
                        {onRetry && (
                          <button
                            onClick={() => onRetry(d)}
                            disabled={busyId === d.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 px-2.5 py-1 text-[10px] font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            {busyId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            Retry approved action
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
