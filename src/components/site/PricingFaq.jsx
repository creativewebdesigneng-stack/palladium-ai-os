import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQS = [
  ['Is there a free plan?', 'No. Blackstar is currently a premium, subscription-only platform. The public website is free to browse; application access is offered through the current Pro/Builder, Business and Enterprise plans shown on this page.'],
  ['What counts as AI usage?', 'Usage limits are defined by the active plan and the connected Blackstar entitlement records. The current plan cards show the included run allowance; provider-specific usage may also depend on the connected service.'],
  ['Can I switch plans later?', 'Use Billing to review the plan actions available to your account. Checkout and the connected billing system show the price and effective timing before a subscription change is confirmed.'],
  ['What is the difference between yearly and monthly?', 'Yearly billing is priced 15% below twelve monthly payments for the current public plans and is billed once per year. Monthly billing is billed each month.'],
  ['What does the Enterprise plan include?', 'Enterprise is the largest current public tier, with a higher AI-workforce allowance, advanced security surfaces, custom integrations and priority infrastructure as listed on the plan card.'],
  ['Can I connect my own AI providers?', 'Blackstar supports multiple model-provider and integration paths. The providers and connection methods available to you depend on the live Integration Hub, your plan entitlements and the provider account you connect.'],
  ['How is payment handled?', 'Blackstar uses Stripe for connected subscription billing. The in-app Billing surface reflects the subscription and payment actions available to the signed-in account.'],
  ['Are prices final?', 'Prices shown are in GBP (£). Applicable tax and the final amount are confirmed in the connected checkout before payment.'],
];

export default function PricingFaq() {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <Accordion type="single" collapsible className="space-y-3">
        {FAQS.map(([q, a], i) => (
          <AccordionItem key={i} value={`item-${i}`} className="rounded-2xl border border-white/10 bg-white/[.025] px-5">
            <AccordionTrigger className="text-left text-base font-medium text-white hover:no-underline">{q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-6 text-zinc-400">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
