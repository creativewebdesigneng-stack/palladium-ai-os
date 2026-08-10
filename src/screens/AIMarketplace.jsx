import { useState } from 'react';
import { Info, Store } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import AIMarketplace from '@/components/ai-marketplace/AIMarketplace';
import CreatorProfiles from '@/components/ai-marketplace/CreatorProfiles';
import ItemDetailDrawer from '@/components/ai-marketplace/ItemDetailDrawer';
import { DISCLAIMER } from '@/components/ai-marketplace/marketData';

export default function AIMarketplacePage() {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <PageHeader eyebrow="Marketplace" title="AI Marketplace" description="Discover, install and purchase AI agents, tools, models, workflows, templates, plugins, integrations and apps — built by the PalladiumAI community." action={
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:flex"><Store className="h-3.5 w-3.5 text-zinc-500" />Mock data</div>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>{DISCLAIMER}</p></div>

      <AIMarketplace onOpen={setSelected} />

      <div className="mt-8"><CreatorProfiles onOpenCreator={() => {}} /></div>

      <ItemDetailDrawer item={selected} onClose={() => setSelected(null)} onInstall={() => {}} />
    </>
  );
}