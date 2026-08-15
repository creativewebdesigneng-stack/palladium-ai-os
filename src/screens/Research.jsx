import { useNavigate } from 'react-router-dom';
import { BookOpen, Globe2, Quote, Search, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const REQUIRED = [
  {
    icon: Globe2,
    title: 'Live search provider',
    text: 'Research needs a server-side web/search provider that returns real URLs, titles, snippets and publication metadata for each run.',
  },
  {
    icon: Quote,
    title: 'Source-backed citations',
    text: 'Every answer claim must retain the source ids used to produce it so the UI can render citations that resolve to real documents.',
  },
  {
    icon: ShieldCheck,
    title: 'Authenticated persistence',
    text: 'Saved research runs and exports should be scoped to the signed-in user or organisation and written through the backend, not browser-only state.',
  },
];

export default function Research() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Research"
        description="Live web research is not connected yet. Fabricated answers, sources, citations and research timings have been removed."
      />

      <div className="mx-auto max-w-4xl">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]">
            <Search className="h-5 w-5 text-violet-300" />
          </div>
          <h2 className="text-xl font-semibold text-white">Research provider required</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            The previous screen displayed hard-coded publisher names, statistics, snippets, citation markers and a fake multi-source research timeline. PalladiumAI will not present those samples as research output. This area will return when search results and citations come from a real provider and are persisted with their provenance.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {REQUIRED.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <Icon className="h-4 w-4 text-violet-300" />
                <p className="mt-3 text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <h3 className="text-sm font-semibold text-white">Useful live alternatives inside PalladiumAI</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button onClick={() => navigate('/knowledge')} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><BookOpen className="h-4 w-4 text-violet-300" />Knowledge search</span>
              <span className="mt-1 block text-[11px] leading-5 text-zinc-500">Search the real private vector index and indexed documents already stored in your workspace.</span>
            </button>
            <button onClick={() => navigate('/web')} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><Globe2 className="h-4 w-4 text-violet-300" />Web capability</span>
              <span className="mt-1 block text-[11px] leading-5 text-zinc-500">See the provider and safety requirements for enabling live web discovery.</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
