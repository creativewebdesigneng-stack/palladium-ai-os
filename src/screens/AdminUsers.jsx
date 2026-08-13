import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Loader2, Search, Users } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import UsersTable from '@/components/admin-users/UsersTable';
import UserDetail from '@/components/admin-users/UserDetail';
import { useWorkspace } from '@/hooks/use-workspace';
import { useToast } from '@/components/ui/use-toast';
import { listAllUsers } from '@/lib/admin/admin.functions';

const PLAN_LABELS = {
  free: 'Free',
  explorer: 'Explorer',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

/**
 * Admin user directory. Every row comes from the platform database via
 * `listAllUsers`, which verifies the caller holds the admin role server-side.
 */
export default function AdminUsers() {
  const { session } = useWorkspace();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAllUsers({ data: {} });
      if (res?.forbidden) {
        setForbidden(true);
        setUsers([]);
        return;
      }
      setForbidden(false);
      setUsers(res?.users ?? []);
    } catch (e) {
      console.error('[admin users]', e);
      setError('We could not load the user directory right now.');
      toast({
        title: 'Could not load users',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session !== 'yes') return;
    load();
  }, [session, load]);

  const plans = useMemo(
    () => ['all', ...Array.from(new Set(users.map((u) => u.plan).filter(Boolean)))],
    [users],
  );

  const filtered = useMemo(() => {
    let list = users;
    if (plan !== 'all') list = list.filter((u) => u.plan === plan);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, plan, query]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="User Management"
        description="Every account on the platform. Access is restricted to administrators and all reads are audited."
        action={
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300">
            <Lock className="h-3.5 w-3.5" />
            Admin access verified server-side
          </span>
        }
      />

      {forbidden ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-12 text-center text-sm text-rose-200">
          You do not have administrator access to the user directory.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email…"
                maxLength={120}
                className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-2.5 py-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Plan</span>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 focus:outline-none [&>option]:bg-[#10121a]"
              >
                {plans.map((p) => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All plans' : (PLAN_LABELS[p] ?? p)}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-zinc-500">{filtered.length} users</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-16 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-rose-400/20 bg-rose-400/5 p-12 text-center text-sm text-rose-300">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">
              <Users className="mx-auto mb-3 h-6 w-6 text-zinc-600" />
              No users match this filter.
            </div>
          ) : (
            <UsersTable users={filtered} onView={setSelected} planLabels={PLAN_LABELS} />
          )}
        </>
      )}

      <UserDetail user={selected} onClose={() => setSelected(null)} planLabels={PLAN_LABELS} />
    </>
  );
}
