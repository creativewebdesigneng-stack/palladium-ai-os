import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PackageCheck } from "lucide-react";
import {
  fulfilMarketplaceOrder,
  getSellerMarketplaceOrders,
} from "@/lib/marketplace/marketplace-order-fulfilment.functions";

const money = (p) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(p || 0) / 100);

export default function MarketplaceFulfilmentCentre() {
  const listFn = useServerFn(getSellerMarketplaceOrders);
  const fulfilFn = useServerFn(fulfilMarketplaceOrder);
  const [orders, setOrders] = useState([]);
  const [evidence, setEvidence] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setOrders(await listFn({ data: undefined }));
  }

  useEffect(() => {
    load().catch((e) => setError(String(e?.message || e)));
  }, []);

  async function deliver(orderId) {
    const form = evidence[orderId] || {};
    setBusy(orderId);
    setError("");
    try {
      await fulfilFn({
        data: {
          order_id: orderId,
          delivery_reference: form.delivery_reference || "",
          instructions: form.instructions || "",
        },
      });
      setEvidence((old) => ({ ...old, [orderId]: {} }));
      await load();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="mt-5 rounded-[24px] border border-white/[.07] bg-white/[.025] p-5">
      <div className="flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-violet-300" />
        <h2 className="text-sm font-semibold text-white">Paid orders & fulfilment</h2>
      </div>
      <p className="mt-1 text-[10px] leading-5 text-zinc-600">
        Delivery is a separate seller action after verified payment. Blackstar never marks an item delivered just because payment completed.
      </p>
      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
      <div className="mt-4 space-y-3">
        {orders.length ? orders.map((order) => {
          const delivery = Array.isArray(order.marketplace_deliveries)
            ? order.marketplace_deliveries[0]
            : order.marketplace_deliveries;
          const form = evidence[order.id] || {};
          const actionable = order.status === "paid" &&
            Number(order.refunded_pence || 0) === 0 &&
            order.refund_state === "none";
          return (
            <article key={order.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    {order.marketplace_listings?.title || "Marketplace order"}
                  </p>
                  <p className="mt-1 text-[9px] text-zinc-500">
                    {money(order.sale_price_pence)} · order {order.status} · delivery {delivery?.status || "missing"}
                  </p>
                </div>
                {order.refund_state !== "none" && (
                  <span className="rounded-full border border-amber-300/20 px-2 py-1 text-[9px] text-amber-200">
                    {order.refund_state} refund · {money(order.refunded_pence)}
                  </span>
                )}
              </div>
              {actionable ? (
                <div className="mt-3 space-y-2">
                  <input
                    className="cm-field"
                    placeholder="Secure download/repository/access reference"
                    value={form.delivery_reference || ""}
                    onChange={(e) => setEvidence((old) => ({
                      ...old,
                      [order.id]: { ...old[order.id], delivery_reference: e.target.value },
                    }))}
                  />
                  <textarea
                    className="cm-field min-h-20"
                    placeholder="Buyer instructions or handoff details"
                    value={form.instructions || ""}
                    onChange={(e) => setEvidence((old) => ({
                      ...old,
                      [order.id]: { ...old[order.id], instructions: e.target.value },
                    }))}
                  />
                  <button
                    onClick={() => deliver(order.id)}
                    disabled={busy === order.id || (!form.delivery_reference?.trim() && !form.instructions?.trim())}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-200 px-3 py-2 text-[10px] font-semibold text-black disabled:opacity-40"
                  >
                    {busy === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
                    Confirm delivery
                  </button>
                </div>
              ) : order.status === "fulfilled" ? (
                <p className="mt-3 text-[10px] text-emerald-300">
                  Delivery confirmed {delivery?.delivered_at ? new Date(delivery.delivered_at).toLocaleString() : ""}
                </p>
              ) : (
                <p className="mt-3 text-[10px] text-zinc-600">
                  Fulfilment is locked while this order is {order.status}
                  {order.refund_state !== "none" ? " / " + order.refund_state + " refunded" : ""}.
                </p>
              )}
            </article>
          );
        }) : (
          <p className="text-xs text-zinc-700">No paid Marketplace orders are waiting for fulfilment.</p>
        )}
      </div>
    </section>
  );
}
