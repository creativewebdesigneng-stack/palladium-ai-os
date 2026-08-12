import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { History, AlertCircle } from 'lucide-react';
import { getWorkspace } from '@/lib/platform/platform.functions';
import { listAuditLogs as listAuditLogsFn } from '@/lib/platform/audit.functions';
import { SectionHead, EmptyState } from './shared';

export default function AuditActivity() {
  const workspaceFn = useServerFn(getWorkspace);
  const auditFn = useServerFn(listAuditLogsFn);

  const workspace = useQuery({
    queryKey: ['team-audit-workspace'],
    queryFn: () => workspaceFn({ data: {} }),
    retry: false,
  });

  const orgId = workspace.data?.organisations?.[0]?.id ?? null;

  const audit = useQuery({
    queryKey: ['team-audit', orgId],
    queryFn: () => auditFn({ data: { orgId } }),
    enabled: !workspace.isLoading,
    retry: false,
  });

  const logs = audit.data?.logs ?? [];

  return (
    <div>
      <SectionHead icon={History} title="Audit Activity" grad="from-zinc-500 to-slate-600" count={logs.length || null} />
      {(workspace.isLoading || audit.isLoading) && (
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-8 text-center text-xs text-zinc-500">Loading audit trail…</div>
      )}
      {audit.error && <EmptyState icon={AlertCircle} title="Could not load audit trail" desc="Please try again in a moment." />}
      {!workspace.isLoading && !audit.isLoading && !audit.error && logs.length === 0 && (
        <EmptyState icon={History} title="No audit events yet" desc="Actions like member changes and organisation updates will appear here." />
      )}
      {logs.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="relative space-y-0.5 pl-6">
            <span className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-violet-400/40 via-white/10 to-transparent" />
            {logs.map((a) => (
              <div key={a.id} className="relative flex items-start gap-3 py-2.5">
                <span className="absolute -left-5 top-3.5 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-zinc-600 to-slate-700 ring-4 ring-[#0b0c12]">
                  <History className="h-3 w-3 text-white" />
                </span>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">
                    <span className="font-medium text-white">{a.action}</span>
                    {a.resource_type && <span className="text-violet-300"> · {a.resource_type}</span>}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">{new Date(a.created_date).toLocaleString()} · {a.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
