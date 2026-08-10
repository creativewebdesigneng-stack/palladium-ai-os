import { useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import MarketingToolbar from '@/components/marketing/MarketingToolbar';
import AIToolsPanel from '@/components/marketing/AIToolsPanel';
import CampaignsGrid from '@/components/marketing/CampaignsGrid';
import SocialMediaPanel from '@/components/marketing/SocialMediaPanel';
import { ContentView, EmailView, SEOView, AnalyticsView, AIAgentsView } from '@/components/marketing/MarketingViews';
import { CAMPAIGNS } from '@/components/marketing/marketingData';

export default function Marketing() {
  const [section, setSection] = useState('campaigns');
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const runTool = (id) => {
    setRunning(id);
    setTimeout(() => {
      setRunning(null);
      const labels = { campaign: 'Generate Campaign', content: 'Generate Content', audience: 'Research Audience', seo: 'SEO Analysis', social: 'Social Media Planning', email: 'Email Campaign' };
      flash(`${labels[id]} completed`);
    }, 1400);
  };

  const active = CAMPAIGNS.filter((c) => c.status === 'active').length;

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Marketing Centre" description="Plan campaigns, content, social, email, and SEO with AI marketing agents." action={
        <div className="hidden gap-3 sm:flex">
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300">{CAMPAIGNS.length} campaigns</div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300">{active} active</div>
        </div>
      } />
      <MarketingToolbar section={section} setSection={setSection} onCreate={() => flash('New campaign form opened')} />

      <div className="mt-4"><AIToolsPanel onRun={runTool} running={running} /></div>

      <div className="mt-4">
        {section === 'campaigns' && <CampaignsGrid />}
        {section === 'content' && <ContentView />}
        {section === 'social' && <SocialMediaPanel />}
        {section === 'email' && <EmailView />}
        {section === 'seo' && <SEOView />}
        {section === 'analytics' && <AnalyticsView />}
        {section === 'ai-agents' && <AIAgentsView />}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}