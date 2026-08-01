import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Zap } from "lucide-react";
import { PageHeader, Panel, Meter } from "@/components/os/page-shell";
import { StatCard } from "@/components/os/stat-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing — PalladiumAI OS" },
      { name: "description", content: "Subscription, compute usage, invoices and payment methods for your AI workforce." },
      { property: "og:title", content: "Billing — PalladiumAI OS" },
      { property: "og:description", content: "Plan, usage and invoices for your AI operating system." },
    ],
  }),
  component: () => (
    <>
      <PageHeader eyebrow="Account" title="Billing" description="You are on the Enterprise plan with 2,481 provisioned agents." actions={<Button variant="hero" size="sm">Upgrade plan</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Plan" value="Enterprise" trend="flat" delta="£1,499/mo" icon={CreditCard} hint="renews 1 Sep" />
        <StatCard label="Compute usage" value="74.3M tok" delta="+9.4%" icon={Zap} hint="of 120M included" />
        <StatCard label="Current invoice" value="£1,912.40" delta="+£413" icon={CreditCard} hint="incl. overage" />
      </div>
      <Panel title="Usage this cycle">
        <div className="space-y-5">
          {[["Tokens", 62], ["Agent hours", 48], ["Connector calls", 81], ["Storage", 34]].map(([k, v]) => (
            <div key={k as string}>
              <div className="flex items-center justify-between text-sm"><span>{k}</span><span className="text-xs text-muted-foreground">{v}%</span></div>
              <Meter value={v as number} className="mt-2" />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Invoices" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {[["Aug 2026", "£1,912.40", "Open"], ["Jul 2026", "£1,684.10", "Paid"], ["Jun 2026", "£1,499.00", "Paid"], ["May 2026", "£1,499.00", "Paid"]].map(([m, amt, s]) => (
            <li key={m as string} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-sm">{m}</span>
              <span className="text-sm font-medium">{amt}</span>
              <span className="text-[11px] text-muted-foreground">{s}</span>
              <Button variant="ghost" size="sm">Download</Button>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  ),
});
