import { useNavigate } from 'react-router-dom';
import { Globe2, ImageIcon, Newspaper, Search, ShieldCheck, Video } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const REQUIRED = [
  {
    icon: Search,
    title: 'Server-side search API',
    text: 'Search requests must run through an authenticated backend provider and return real result URLs, snippets and timestamps.',
  },
  {
    icon: Newspaper,
    title: 'Freshness and source metadata',
    text: 'News results need publication dates and source attribution so stale or unsupported claims are not presented as current.',
  },
  {
    icon: ImageIcon,
    title: 'Media result providers',
    text: 'Image and video tabs should only appear when their results come from real provider APIs with safe external URLs.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe fetching and persistence',
    text: 'Fetched pages need SSRF protections, size/time limits and audited workspace-scoped storage before agents can use them.',
  },
];

export default function Web() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="Discovery"
        title="PalladiumAI Web"
        description="Live web discovery is not connected yet. Illustrative results, artificial search delays and browser-only saved searches have been removed."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]">
            <Globe2 className="h-5 w-5 text-violet-300" />
          </div>
          <h2 className="text-xl font-semibold text-white">Web search provider required</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            The previous interface rendered illustrative AI answers, web/news/image/video results and search history without a live search backend. PalladiumAI now keeps this surface inactive until every result can be traced to an actual provider response.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {REQUIRED.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <Icon className="h-4 w-4 text-violet-300" />
                <p className="mt-3 text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <h3 className="text-sm font-semibold text-white">Live capabilities available now</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Use persisted data sources until external web discovery is connected.</p>
          <div className="mt-5 space-y-2.5">
            <button onClick={() => navigate('/knowledge')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><Search className="h-4 w-4 text-violet-300" />Private knowledge search</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Query the real indexed documents and vector-search layer used by agents.</span>
            </button>
            <button onClick={() => navigate('/search')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><Newspaper className="h-4 w-4 text-violet-300" />Research setup</span>
              <span className="mt-1 block text-[11px] text-zinc-500">See what is required before source-backed research and citations can be enabled.</span>
            </button>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><Video className="h-4 w-4 text-zinc-500" />Image and video discovery</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Disabled until real media-search providers are connected.</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
