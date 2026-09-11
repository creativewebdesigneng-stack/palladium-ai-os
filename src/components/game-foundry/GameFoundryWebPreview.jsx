import { useMemo } from 'react';
import { Gamepad2, TriangleAlert } from 'lucide-react';
import { buildGameFoundryWebPreviewDocument } from '@/lib/game-foundry/game-foundry-web-preview';

export default function GameFoundryWebPreview({ sourceManifest, title = 'Playable web preview' }) {
  const result = useMemo(() => {
    try {
      return { html: buildGameFoundryWebPreviewDocument(sourceManifest), error: null };
    } catch (error) {
      return { html: null, error: error instanceof Error ? error.message : 'Web preview could not be assembled.' };
    }
  }, [sourceManifest]);

  if (result.error) {
    return <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-3 text-xs text-amber-200">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{result.error}</span>
    </div>;
  }

  return <div className="overflow-hidden rounded-xl border border-emerald-300/15 bg-black/30">
    <div className="flex items-center gap-2 border-b border-white/[.06] px-3 py-2 text-[11px] text-zinc-400">
      <Gamepad2 className="h-3.5 w-3.5 text-emerald-300" />
      <span>{title}</span>
      <span className="ml-auto text-[10px] text-zinc-600">sandboxed · network blocked</span>
    </div>
    <iframe
      title={title}
      srcDoc={result.html ?? ''}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="h-[420px] w-full bg-white"
    />
  </div>;
}
