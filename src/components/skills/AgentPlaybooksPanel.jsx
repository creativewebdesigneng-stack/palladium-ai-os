import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BookOpenCheck, Download, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty, Failed, Loading } from '@/components/business/live';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import {
  deleteAgentSkill,
  listAgentSkills,
  setAgentSkillEnabled,
} from '@/lib/runtime/agent-skills/agent-skills.functions';
import { installIntegrationPlaybookPack } from '@/lib/runtime/agent-skills/builtin-integration-playbooks.functions';

function riskLabel(skill) {
  if (skill.scan_verdict === 'dangerous') return 'Dangerous';
  if (skill.scan_verdict === 'warning') return 'Review warnings';
  return skill.dangerous ? 'Operator reviewed' : 'Scanned';
}

export default function AgentPlaybooksPanel({ enabled }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const listFn = useServerFn(listAgentSkills);
  const toggleFn = useServerFn(setAgentSkillEnabled);
  const deleteFn = useServerFn(deleteAgentSkill);
  const installPackFn = useServerFn(installIntegrationPlaybookPack);

  const skills = useQuery({
    queryKey: ['agent-skills'],
    queryFn: () => listFn({ data: {} }),
    enabled,
    retry: false,
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled: next }) => toggleFn({ data: { id, enabled: next } }),
    onSuccess: (_result, variables) => {
      toast({
        title: variables.enabled ? 'Playbook enabled' : 'Playbook disabled',
        description: variables.enabled
          ? 'Eligible agents can now discover this playbook when its required tools are granted.'
          : 'Agents will no longer load this playbook into task context.',
      });
      qc.invalidateQueries({ queryKey: ['agent-skills'] });
    },
    onError: (error) =>
      toast({ variant: 'destructive', title: 'Could not update playbook', description: friendlyMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: (id) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast({ title: 'Playbook deleted', description: 'The reusable agent playbook was removed from your workspace.' });
      qc.invalidateQueries({ queryKey: ['agent-skills'] });
    },
    onError: (error) =>
      toast({ variant: 'destructive', title: 'Could not delete playbook', description: friendlyMessage(error) }),
  });

  const installPack = useMutation({
    mutationFn: () => installPackFn({ data: {} }),
    onSuccess: async (result) => {
      toast({
        title: 'Integration playbooks installed',
        description: `${result.count} audited playbooks are now available to eligible agents.`,
      });
      await qc.invalidateQueries({ queryKey: ['agent-skills'] });
    },
    onError: (error) =>
      toast({ variant: 'destructive', title: 'Could not install playbooks', description: friendlyMessage(error) }),
  });

  const rows = useMemo(() => skills.data?.skills ?? [], [skills.data]);
  const reviewCount = rows.filter((skill) => skill.source_kind === 'reflection' && !skill.enabled).length;
  const builtinCount = rows.filter((skill) => skill.source_kind === 'builtin').length;

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            <BookOpenCheck className="h-4 w-4" />
            Reusable agent playbooks
          </div>
          <p className="max-w-3xl text-xs leading-5 text-zinc-400">
            Security-scanned SKILL.md procedures. The audited built-in pack consolidates Taste Skill, Ornith, Raven, SuperPlane and Scout patterns into PalladiumAI's existing Skills, Harness, workflow, research, CRM, Knowledge and integration controls rather than adding duplicate runtimes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{rows.length} installed</Badge>
          {builtinCount > 0 && <Badge variant="outline">{builtinCount} built-in</Badge>}
          {reviewCount > 0 && <Badge variant="outline">{reviewCount} awaiting review</Badge>}
          <Button size="sm" variant="outline" disabled={installPack.isPending} onClick={() => installPack.mutate()}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {installPack.isPending ? 'Installing…' : 'Install integration pack'}
          </Button>
        </div>
      </div>

      {skills.isLoading && <Loading label="Loading reusable playbooks…" />}
      {skills.isError && <Failed message={friendlyMessage(skills.error)} onRetry={() => skills.refetch()} />}
      {skills.isSuccess && rows.length === 0 && (
        <Empty
          icon={Sparkles}
          title="No reusable playbooks yet"
          desc="Install the audited integration pack or promote verified successful agent procedures into review candidates."
        />
      )}

      {skills.isSuccess && rows.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((skill) => {
            const reflected = skill.source_kind === 'reflection';
            const builtin = skill.source_kind === 'builtin';
            const blocked = skill.scan_verdict === 'dangerous';
            return (
              <article key={skill.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-white">{skill.name}</h3>
                      <Badge variant="secondary">v{skill.version}</Badge>
                      {reflected && <Badge variant="outline">Learned candidate</Badge>}
                      {builtin && <Badge variant="outline">Audited built-in</Badge>}
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-400">{skill.description}</p>
                  </div>
                  <Badge variant={blocked ? 'destructive' : 'outline'}>{riskLabel(skill)}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
                  {(skill.requires_tools ?? []).map((tool) => (
                    <span key={tool} className="rounded-full border border-white/10 px-2 py-0.5">tool:{tool}</span>
                  ))}
                  {(skill.requires_scripts ?? []).map((script) => (
                    <span key={script} className="rounded-full border border-white/10 px-2 py-0.5">script:{script}</span>
                  ))}
                  {(skill.requires_tools ?? []).length === 0 && (skill.requires_scripts ?? []).length === 0 && (
                    <span className="rounded-full border border-white/10 px-2 py-0.5">guidance only</span>
                  )}
                </div>

                {reflected && !skill.enabled && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5 text-xs text-amber-100">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Learned playbooks stay disabled until an operator reviews and explicitly enables them.
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={blocked || toggle.isPending}
                    onClick={() => toggle.mutate({ id: skill.id, enabled: !skill.enabled })}
                  >
                    {skill.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(skill.id)}
                    aria-label={`Delete ${skill.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
