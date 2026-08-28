import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import SkillsToolbar from '@/components/skills/SkillsToolbar';
import ToolCard from '@/components/skills/ToolCard';
import ToolDetailDrawer from '@/components/skills/ToolDetailDrawer';
import AgentPlaybooksPanel from '@/components/skills/AgentPlaybooksPanel';
import { CATEGORIES } from '@/components/skills/skillsData';
import { getToolFramework, saveToolPermission } from '@/lib/tools/tools.functions';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { Empty, Loading, Failed } from '@/components/business/live';
import { useToast } from '@/components/ui/use-toast';

/** Maps a live `tools` row + permission into the shape the tool cards expect. */
function toCardTool(row, agents) {
  const enabled = row.permission ? row.permission.enabled !== false : false;
  const assigned = agents.filter((a) => (a.allowed_tools ?? []).includes(row.slug));
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || 'No description recorded.',
    category: row.category || 'General',
    status: enabled ? 'Enabled' : 'Disabled',
    executable: row.executable,
    requiresApproval: row.permission?.requires_approval ?? true,
    allowedDomains: row.permission?.allowed_domains ?? [],
    permissions: enabled ? ['Execute'] : [],
    authMethod: row.auth_method || 'None',
    version: row.version || null,
    agents: assigned.length,
    agentNames: assigned.map((a) => a.name).filter(Boolean),
  };
}

export default function Skills() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const frameworkFn = useServerFn(getToolFramework);
  const savePermissionFn = useServerFn(saveToolPermission);

  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  const framework = useQuery({
    queryKey: ['tool-framework'],
    queryFn: () => frameworkFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const tools = useMemo(
    () => (framework.data?.tools ?? []).map((t) => toCardTool(t, framework.data?.agents ?? [])),
    [framework.data],
  );

  const toggleMutation = useMutation({
    mutationFn: (tool) =>
      savePermissionFn({
        data: { tool: tool.slug, enabled: tool.status !== 'Enabled' },
      }),
    onSuccess: (_res, tool) => {
      toast({
        title: tool.status === 'Enabled' ? 'Tool disabled' : 'Tool enabled',
        description: `${tool.name} permission saved to your workspace.`,
      });
      qc.invalidateQueries({ queryKey: ['tool-framework'] });
    },
    onError: (err) =>
      toast({ variant: 'destructive', title: 'Could not save', description: friendlyMessage(err) }),
  });

  const filtered = useMemo(() => {
    let list = tools;
    if (category !== 'All') list = list.filter((t) => t.category === category);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tools, category, query]);

  const stats = useMemo(
    () => ({
      total: tools.length,
      enabled: tools.filter((t) => t.status === 'Enabled').length,
      executable: tools.filter((t) => t.executable).length,
    }),
    [tools],
  );

  return (
    <>
      <PageHeader
        eyebrow="Capabilities"
        title="Skills & Tools"
        description="Live executable tools plus security-scanned reusable playbooks your agents can discover and follow."
        action={
          framework.isSuccess ? (
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{stats.total} tools</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{stats.enabled} enabled</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{stats.executable} executable</span>
            </div>
          ) : null
        }
      />

      {session === 'no' && <Failed message="Sign in to manage your skills and tool registry." />}
      {session === 'yes' && <AgentPlaybooksPanel enabled />}
      {session === 'yes' && framework.isLoading && <Loading label="Loading your tool registry…" />}
      {framework.isError && (
        <Failed message={friendlyMessage(framework.error)} onRetry={() => framework.refetch()} />
      )}

      {framework.isSuccess && (
        <>
          <SkillsToolbar
            category={category}
            onCategory={setCategory}
            query={query}
            onQuery={setQuery}
          />

          {tools.length === 0 ? (
            <Empty
              icon={Wrench}
              title="No tools yet"
              desc="Your workspace tool registry is empty. Tools become available as integrations are connected."
            />
          ) : filtered.length === 0 ? (
            <Empty title="No matches" desc="No tools match your filters." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((t) => (
                <ToolCard key={t.id} tool={t} onOpen={setOpen} />
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {open && (
          <ToolDetailDrawer
            tool={open}
            onClose={() => setOpen(null)}
            onToggle={(t) => toggleMutation.mutate(t)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
