import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  ['What is PalladiumAI?', 'PalladiumAI is a unified AI operating system that lets you build agents, automate work, connect every major AI model, create apps, analyse files, and manage an AI workforce from one platform.'],
  ['Can I use multiple AI models?', 'Yes. Connect Claude, GPT, Gemini, Llama, and more, then switch between them instantly or let PalladiumAI route to the best model for each task.'],
  ['Do I need to code to build agents?', 'No. The agent wizard guides you through identity, model, capabilities, and permissions in five steps — no code required. Developers can also use the full SDK.'],
  ['Is my data secure?', 'All workspaces are isolated with role-based access. Enterprise plans add SSO, on-premise options, and priority infrastructure.'],
  ['Can I cancel anytime?', 'Yes. Plans are month-to-month and you can cancel or change tiers from billing at any time.'],
  ['Do you offer a free trial?', 'Yes — Pro and Team plans include a free trial with no credit card required to start.'],
];

export default function Faq() {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map(([q, a], i) => (
          <AccordionItem key={i} value={`item-${i}`} className="rounded-2xl border border-white/10 bg-white/[.025] px-5">
            <AccordionTrigger className="text-left text-base font-medium text-white hover:no-underline">{q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-6 text-zinc-400">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}