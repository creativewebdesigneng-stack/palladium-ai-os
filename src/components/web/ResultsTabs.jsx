import { Globe, ExternalLink, Newspaper, ImageIcon, Play, FileText } from 'lucide-react';
import { WEB_RESULTS, NEWS, IMAGES, VIDEOS, SOURCES } from './webData';

function Favicon({ grad }) { return <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${grad}`}><Globe className="h-3.5 w-3.5 text-white" /></span>; }

function WebTab({ loading }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />)}</div>;
  return (
    <div className="space-y-3">
      {WEB_RESULTS.map(r => (
        <a key={r.id} href={`https://${r.url}`} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/10 bg-white/[.03] p-4 hover:border-violet-400/30">
          <div className="flex items-center gap-2">
            <Favicon grad={r.favicon} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] text-zinc-500">{r.url}</p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{r.badge}</span>
          </div>
          <p className="mt-2 text-[14px] font-medium text-violet-300 hover:underline">{r.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">{r.snippet}</p>
          <p className="mt-1.5 text-[10px] text-zinc-600">{r.date}</p>
        </a>
      ))}
    </div>
  );
}

function NewsTab({ loading }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>;
  return (
    <div className="space-y-2">
      {NEWS.map(n => (
        <div key={n.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3">
          <Favicon grad={n.favicon} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><Newspaper className="h-3 w-3" />{n.source} · <span className="text-zinc-600">{n.time}</span></p>
            <p className="mt-0.5 text-[13px] font-medium text-zinc-200">{n.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ImagesTab({ loading }) {
  if (loading) return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/5" />)}</div>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {IMAGES.map(im => (
        <div key={im.id} className={`group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${im.grad}`}>
          <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-6 w-6 text-white/30" /></div>
          <p className="absolute bottom-2 left-2 right-2 truncate text-[10px] text-white/70">{im.label}</p>
        </div>
      ))}
    </div>
  );
}

function VideosTab({ loading }) {
  if (loading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />)}</div>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {VIDEOS.map(v => (
        <div key={v.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.03]">
          <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${v.grad}`}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 ring-1 ring-white/20"><Play className="h-5 w-5 fill-white text-white" /></span>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{v.duration}</span>
          </div>
          <div className="p-3">
            <p className="text-[13px] font-medium text-zinc-200">{v.title}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{v.channel} · {v.views} views</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SourcesTab({ loading }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>;
  return (
    <div className="space-y-2">
      {SOURCES.map((s, i) => (
        <a key={s.id} href={`https://${s.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 hover:border-violet-400/30">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/5 text-[11px] font-medium text-zinc-400">{i + 1}</span>
          <Favicon grad={s.favicon} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-violet-300">{s.title}</p>
            <p className="truncate text-[10px] text-zinc-500">{s.url}</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-zinc-600" />
        </a>
      ))}
    </div>
  );
}

export { WebTab, NewsTab, ImagesTab, VideosTab, SourcesTab };