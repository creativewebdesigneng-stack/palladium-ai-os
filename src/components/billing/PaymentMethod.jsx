import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { PAYMENT_METHOD } from './billingData';

export default function PaymentMethod() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.05] to-transparent p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-16 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-semibold text-white">
            {PAYMENT_METHOD.brand}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-white">{PAYMENT_METHOD.masked}</p>
              {PAYMENT_METHOD.isDefault && <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">Default</span>}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Expires {PAYMENT_METHOD.expiry} · {PAYMENT_METHOD.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
          <button className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
            <Pencil className="h-3.5 w-3.5" /> Update
          </button>
          <button className="flex items-center gap-1.5 rounded-xl border border-red-400/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}