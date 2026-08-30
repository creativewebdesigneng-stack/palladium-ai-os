import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Bot, BriefcaseBusiness, Building2, CheckCircle2, ChevronLeft, Code2,
  Gamepad2, Megaphone, Plug, Rocket, ShoppingBag, Sparkles, Wrench, Workflow, Zap,
} from 'lucide-react';
import { FAST_TRACKS, getFastTrack } from '@/lib/fast-track/fast-tracks';

const TRACK_ICONS = {
  gamepad: Gamepad2,
  briefcase: BriefcaseBusiness,
  building: Building2,
  'shopping-bag': ShoppingBag,
  megaphone: Megaphone,
  code: Code2,
};

const SECTIONS = [
  ['Ready-to-Go Agents', 'agents', Bot, 'Specialist agents and the runtime surfaces that power them.'],
  ['Tools & Studios', 'tools', Wrench, 'The existing PalladiumAI tools most useful for this Fast Track.'],
  ['Workflows & Automations', 'workflows', Workflow, 'Durable processes for moving the work from idea to result.'],
  ['Skills & Templates', 'skills', Sparkles, 'Reusable knowledge, playbooks and starting points.'],
  ['Integrations', 'integrations', Plug, 'Connect the external systems this type of work depends on.'],
];

function TrackCard({ track, onOpen }) {
  const Icon = TRACK_ICONS[track.icon] ?? Zap;
  return (
    <button
      type="button"
      onClick={() => onOpen(track.id)}
      className="group flex min-h-[250px] flex-col rounded-2xl border border-white/10 bg-white/[.025] p-6 text-left transition hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-violet-500/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-5 text-xl font-semibold text-white">{track.name}</p>
      <p className="mt-2 text-sm font-medium text-violet-200/80">{track.tagline}</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">{track.description}</p>
      <span className="mt-5 flex items-center gap-2 text-sm font-medium text-white">
        Open Fast Track <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </button>
  );
}

function ResourceCard({ item }) {
  return (
    <Link
      to={item.href}
      className="group rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/25 hover:bg-white/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1.5 text-xs leading-5 text-zinc-500">{item.description}</p>
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
      </div>
    </Link>
  );
}

function TrackDetail({ track, onBack }) {
  const Icon = TRACK_ICONS[track.icon] ?? Zap;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
        <ChevronLeft className="h-4 w-4" /> All Fast Tracks
      </button>

      <section className="overflow-hidden rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.015))] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
              <Icon className="h-3.5 w-3.5" /> {track.name} Fast Track
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{track.tagline}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">{track.description}</p>
          </div>
          <Link to="/agent-builder" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">
            Create specialist agent <Bot className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-violet-300" />
          <div><h2 className="text-lg font-semibold text-white">Start Here</h2><p className="text-xs text-zinc-500">High-value actions that take you straight into the real PalladiumAI capability.</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">{track.quickActions.map((item) => <ResourceCard key={item.id} item={item} />)}</div>
      </section>

      {SECTIONS.map(([title, key, SectionIcon, description]) => (
        <section key={key} className="rounded-2xl border border-white/10 bg-white/[.02] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.05] text-violet-300"><SectionIcon className="h-4 w-4" /></span>
            <div><h2 className="text-base font-semibold text-white">{title}</h2><p className="text-xs text-zinc-500">{description}</p></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{track[key].map((item) => <ResourceCard key={item.id} item={item} />)}</div>
        </section>
      ))}

      <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.035] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-4 w-4" /></span>
          <div><h2 className="text-base font-semibold text-white">Recommended Setup</h2><p className="text-xs text-zinc-500">Complete these when they apply so the Fast Track has the connections it needs.</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">{track.setup.map((item) => <ResourceCard key={item.id} item={item} />)}</div>
      </section>

      <p className="pb-4 text-center text-xs text-zinc-600">Fast Track organises existing PalladiumAI systems. It does not create duplicate agents, workflows, integrations or studios.</p>
    </div>
  );
}

export default function FastTrackWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('track');
  const selected = selectedId ? getFastTrack(selectedId) : null;

  const openTrack = (id) => setSearchParams({ track: id });
  const closeTrack = () => setSearchParams({});

  if (selected) return <TrackDetail track={selected} onBack={closeTrack} />;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-8 rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.015))] p-6 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200"><Zap className="h-3.5 w-3.5" /> Fast Track</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Everything you need for the job, in one place.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">Choose what you are trying to accomplish. PalladiumAI brings the right agents, tools, workflows, skills and integrations together while keeping the existing systems underneath as the source of truth.</p>
        </div>
      </section>

      <div className="mb-5 flex items-end justify-between gap-4">
        <div><h2 className="text-xl font-semibold text-white">Choose your Fast Track</h2><p className="mt-1 text-sm text-zinc-500">Six ready-to-go workspaces are available now.</p></div>
        <Link to="/integrations" className="hidden text-sm font-medium text-violet-300 hover:text-violet-200 sm:block">Manage integrations</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{FAST_TRACKS.map((track) => <TrackCard key={track.id} track={track} onOpen={openTrack} />)}</div>
    </div>
  );
}
