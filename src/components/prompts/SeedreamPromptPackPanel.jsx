import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Download, ImageIcon, Layers3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { installSeedreamPromptPack } from '@/lib/prompts/builtin-seedream-prompts.functions';

export default function SeedreamPromptPackPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const installFn = useServerFn(installSeedreamPromptPack);
  const install = useMutation({
    mutationFn: () => installFn({ data: {} }),
    onSuccess: async (result) => {
      toast({ title: 'Seedream prompt pack installed', description: `${result.count} production collections were added to your versioned Prompt Workspace.` });
      await qc.invalidateQueries({ queryKey: ['prompt-workspace'] });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not install Seedream pack', description: friendlyMessage(error) }),
  });

  return (
    <section className="mt-5 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/[.035] p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200"><ImageIcon className="h-4 w-4" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-white">Seedream 5 production prompt pack</h2><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">15 collections</span></div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">Consolidates the supplied Awesome Seedream 5 prompt library into PalladiumAI's existing private, versioned Prompt Workspace. It covers infographic, advertising, e-commerce, portraits, storyboards, UI, branding, architecture, editing, localisation, illustration, historical, publishing, practical workflow and structured-agent prompt patterns without adding a second prompt database.</p>
          </div>
        </div>
        <button type="button" disabled={install.isPending} onClick={() => install.mutate()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3.5 py-2 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-400/15 disabled:opacity-40">
          {install.isPending ? <Layers3 className="h-3.5 w-3.5 animate-pulse" /> : <Download className="h-3.5 w-3.5" />}{install.isPending ? 'Installing…' : 'Install Seedream pack'}
        </button>
      </div>
    </section>
  );
}
