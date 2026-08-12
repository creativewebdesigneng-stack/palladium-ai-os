import { CreditCard, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentMethod({ onAdd }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
        <CreditCard className="h-5 w-5 text-white" />
      </span>
      <p className="mt-3 text-sm text-zinc-300">Payment method</p>
      <p className="mt-1 text-[11px] text-zinc-600">Cards are stored by Stripe only. Add, update or remove a card in the secure billing portal.</p>
      <button onClick={onAdd}
        className="mx-auto mt-4 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white hover:opacity-90">
        <ExternalLink className="h-3.5 w-3.5" /> Manage in Stripe portal
      </button>
    </motion.div>
  );
}
