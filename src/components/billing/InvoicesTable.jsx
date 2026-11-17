import { FileText } from 'lucide-react';

export default function InvoicesTable() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center">
      <FileText className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
      <p className="text-sm text-zinc-300">Invoice documents are not available yet.</p>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-zinc-500">
        Blackstar currently stores subscription and marketplace payment events, but does not yet have an invoice-document record or download integration. Payment activity is shown separately below; purchases are not presented as invoices.
      </p>
    </div>
  );
}
