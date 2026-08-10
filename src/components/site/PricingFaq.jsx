import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQS = [
  ['Is there a free plan?', 'No. PalladiumAI is a premium, subscription-only platform. Every customer needs an active paid plan — Basic, Professional, Business, Enterprise or Enterprise+ — to access the application. The public website remains free to browse.'],
  ['What counts as AI usage?', 'AI usage is measured in credits, consumed by chat, agent runs, web research, image generation, transcription and other AI calls. Each plan includes a monthly credit allowance scaled to its tier.'],
  ['Can I switch plans later?', 'Yes. You can upgrade, downgrade or cancel anytime from your billing settings. Upgrades take effect immediately; downgrades take effect at the end of your current billing period.'],
  ['What is the difference between yearly and monthly?', 'Yearly billing gives you a 15% discount versus monthly and is billed once per year. Monthly is billed each month with no long-term commitment.'],
  ['How does the Enterprise+ plan work?', 'Enterprise+ is a fully customised plan with bespoke agent development, custom model integrations, dedicated infrastructure options and a named account team. Contact sales for a tailored proposal.'],
  ['Can I bring my own AI models?', 'Yes. Connect your own model providers and keys on Business and above; Enterprise and Enterprise+ support custom and on-premise model integrations.'],
  ['How is payment handled?', 'PalladiumAI uses Stripe for secure billing. Manage your subscription, payment method, invoices and renewals from the in-app billing portal.'],
  ['Are prices final?', 'Prices shown are in GBP (£). Final pricing and applicable tax are confirmed at checkout once billing is connected to your account.'],
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