import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  Search, Wallet, Bookmark, ListChecks, RefreshCw, Trash2, Plus, ShieldAlert, Globe2, Bot,
} from 'lucide-react';

import ShoppingBoard from './ShoppingBoard';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/mission/catalog';
import {
  getShoppingWorkspace, runShoppingSearch, preparePurchase, saveSpendLimits, trackProduct,
  refreshWatch, deleteWatch, saveShoppingList, deleteShoppingList, saveListItem, deleteListItem,
} from '@/lib/shopping/shopping.functions';

const Card = ({ title, icon: Icon, tint = 'text-violet-400', children, action }) => (
  <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
    <div className="mb-4 flex items-center gap-2">
      <Icon className={`h-4 w-4 ${tint}`} />
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
    {children}
  </section>
);

const input =
  'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none';

/**
 * The Shopping Agent workspace: research, comparison, tracking, lists and the
 * server-enforced spend limits. Nothing here can authorise a payment — the agent
 * only ever prepares a checkout that the user approves and completes themselves.
 */
export default function ShoppingWorkspace({ agents = [] }) {
  const qc = useQueryClient();
  const workspaceFn = useServerFn(getShoppingWorkspace);
  const searchFn = useServerFn(runShoppingSearch);
  const prepareFn = useServerFn(preparePurchase);
  const limitsFn = useServerFn(saveSpendLimits);
  const trackFn = useServerFn(trackProduct);
  const refreshFn = useServerFn(refreshWatch);
  const removeWatchFn = useServerFn(deleteWatch);
  const listFn = useServerFn(saveShoppingList);
  const removeListFn = useServerFn(deleteShoppingList);
  const itemFn = useServerFn(saveListItem);
  const removeItemFn = useServerFn(deleteListItem);

  const [requirement, setRequirement] = useState('');
  const [budget, setBudget] = useState('');
  const [agentId, setAgentId] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [limitForm, setLimitForm] = useState(null);
  const [listName, setListName] = useState('');
  const [itemDrafts, setItemDrafts] = useState({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shopping-workspace'],
    queryFn: () => workspaceFn({ data: {} }),
    staleTime: 15_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['shopping-workspace'] });
  const fail = (e) => toast({ title: 'Could not complete that', description: friendlyMessage(e), variant: 'destructive' });

  const userLimit = useMemo(
    () => (data?.limitRows ?? []).find((r) => !r.agent_id) ?? null,
    [data?.limitRows],
  );
  const limits = data?.limits;

  const search = useMutation({
    mutationFn: (vars) => searchFn({ data: vars }),
    onSuccess: (res) => {
      toast({
        title: `${res.results.length} options found`,
        description:
          res.provider === 'simulated'
            ? 'Simulated browsing provider — results are illustrative, not live retailer data.'
            : `Researched via the ${res.provider} browser provider.`,
      });
      setRequirement('');
      refresh();
    },
    onError: fail,
  });

  const prepare = useMutation({
    mutationFn: (vars) => prepareFn({ data: vars }),
    onSuccess: () => {
      toast({ title: 'Purchase prepared', description: 'It is now waiting in your Approval centre. Nothing is paid until you approve and complete checkout.' });
      refresh();
    },
    onError: fail,
    onSettled: () => setBusyId(null),
  });

  const saveLimits = useMutation({
    mutationFn: (vars) => limitsFn({ data: vars }),
    onSuccess: () => { toast({ title: 'Spend limits saved' }); setLimitForm(null); refresh(); },
    onError: fail,
  });

  const track = useMutation({ mutationFn: (vars) => trackFn({ data: vars }), onSuccess: () => { toast({ title: 'Tracking product' }); refresh(); }, onError: fail });
  const recheck = useMutation({ mutationFn: (id) => refreshFn({ data: { id } }), onSuccess: (res) => { toast({ title: res.hitTarget ? 'Target price reached' : 'Price checked' }); refresh(); }, onError: fail });
  const dropWatch = useMutation({ mutationFn: (id) => removeWatchFn({ data: { id } }), onSuccess: refresh, onError: fail });
  const addList = useMutation({ mutationFn: (vars) => listFn({ data: vars }), onSuccess: () => { setListName(''); refresh(); }, onError: fail });
  const dropList = useMutation({ mutationFn: (id) => removeListFn({ data: { id } }), onSuccess: refresh, onError: fail });
  const addItem = useMutation({ mutationFn: (vars) => itemFn({ data: vars }), onSuccess: refresh, onError: fail });
  const dropItem = useMutation({ mutationFn: (id) => removeItemFn({ data: { id } }), onSuccess: refresh, onError: fail });

  const form = limitForm ?? {
    perTransactionLimit: userLimit?.per_transaction_limit ?? '',
    monthlyCap: userLimit?.monthly_cap ?? '',
    currency: userLimit?.currency ?? 'GBP',
  };

  const provider = data?.sessions?.[0]?.provider ?? 'simulated';
  const domains = data?.sessions?.[0]?.allowed_domains ?? [];

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[.06] p-4">
          <p className="text-[11px] text-rose-200/90">{friendlyMessage(error)}</p>
          <button onClick={() => refetch()} className="ml-auto rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-white hover:bg-white/10">Try again</button>
        </div>
      )}

      <Card title="Research a purchase" icon={Search}>
        <form
          className="grid gap-2 sm:grid-cols-[1fr_120px_180px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            search.mutate({
              requirement,
              budget: budget === '' ? null : Number(budget),
              agentId: agentId || null,
            });
          }}
        >
          <input className={input} placeholder="I need a new office chair under £250" value={requirement} onChange={(e) => setRequirement(e.target.value)} />
          <input className={input} type="number" min="0" step="0.01" placeholder="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <select className={input} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">Route automatically</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button type="submit" disabled={search.isPending || !requirement.trim()} className="rounded-xl bg-violet-500/90 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
            {search.isPending ? 'Searching…' : 'Search & compare'}
          </button>
        </form>
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
          <Globe2 className="h-3 w-3 text-cyan-400" />
          Browser provider: <span className="text-zinc-300">{provider}</span>
          {provider === 'simulated' && <span className="text-amber-300/90">— simulated results, not live retailer browsing</span>}
          {domains.slice(0, 6).map((d) => <span key={d} className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-zinc-500">{d}</span>)}
        </p>
      </Card>

      <Card
        title="Spend limits"
        icon={Wallet}
        tint="text-emerald-400"
        action={
          <span className="text-[10px] text-zinc-500">
            {limits ? `${formatMoney(limits.userMonthSpend, limits.currency)} committed this month` : ''}
          </span>
        }
      >
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]"
          onSubmit={(e) => { e.preventDefault(); saveLimits.mutate({ ...form, agentId: null }); }}
        >
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">Per transaction</span>
            <input className={input} type="number" min="0" step="0.01" value={form.perTransactionLimit ?? ''} onChange={(e) => setLimitForm({ ...form, perTransactionLimit: e.target.value })} placeholder="No limit" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">Monthly cap (account)</span>
            <input className={input} type="number" min="0" step="0.01" value={form.monthlyCap ?? ''} onChange={(e) => setLimitForm({ ...form, monthlyCap: e.target.value })} placeholder="No cap" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">Currency</span>
            <input className={input} value={form.currency} onChange={(e) => setLimitForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} />
          </label>
          <button type="submit" disabled={saveLimits.isPending} className="self-end rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40">Save</button>
        </form>
        <p className="mt-3 flex items-start gap-1.5 text-[10px] text-zinc-500">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
          Limits are enforced on the server when a purchase is prepared, when you approve it and again at checkout. Per-agent budgets are set on each agent. No payment card or credential is ever stored here or shared with an agent.
        </p>
      </Card>

      <ShoppingBoard
        shoppingResults={data?.results ?? []}
        purchases={data?.purchases ?? []}
        loading={isLoading}
        busyId={busyId}
        onPrepare={(r) => { setBusyId(r.id); prepare.mutate({ resultId: r.id, quantity: 1, agentId: agentId || null }); }}
        onTrack={(r) => track.mutate({ resultId: r.id, targetPrice: r.price, agentId: agentId || null })}
      />

      <Card title="Tracked products" icon={Bookmark} tint="text-sky-400">
        {(data?.watches ?? []).length === 0 ? (
          <p className="text-xs text-zinc-600">Nothing tracked yet. Use “Track” on any result to watch its price and availability.</p>
        ) : (
          <ul className="space-y-2">
            {(data?.watches ?? []).map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{w.product}</p>
                  <p className="text-[10px] text-zinc-500">
                    {w.seller ?? 'any seller'} · now {w.last_price != null ? formatMoney(w.last_price, w.currency) : '—'}
                    {w.target_price != null && ` · target ${formatMoney(w.target_price, w.currency)}`}
                    {w.in_stock === false && ' · out of stock'}
                  </p>
                </div>
                <button onClick={() => recheck.mutate(w.id)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/10">
                  <RefreshCw className="h-3 w-3" />Check
                </button>
                <button onClick={() => dropWatch.mutate(w.id)} className="rounded-lg border border-white/10 bg-white/5 p-1 text-zinc-400 hover:text-rose-300">
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Shopping lists" icon={ListChecks} tint="text-fuchsia-400">
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); addList.mutate({ name: listName }); }}
        >
          <input className={input} placeholder="New list, e.g. Home office refresh" value={listName} onChange={(e) => setListName(e.target.value)} />
          <button type="submit" disabled={!listName.trim() || addList.isPending} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40">
            <Plus className="h-3.5 w-3.5" />Add list
          </button>
        </form>

        {(data?.lists ?? []).length === 0 ? (
          <p className="text-xs text-zinc-600">No lists yet.</p>
        ) : (
          <div className="space-y-4">
            {(data?.lists ?? []).map((list) => {
              const items = (data?.items ?? []).filter((i) => i.list_id === list.id);
              const draft = itemDrafts[list.id] ?? '';
              return (
                <div key={list.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-white">{list.name}</p>
                    <span className="text-[10px] text-zinc-600">{items.length} item(s)</span>
                    <button onClick={() => dropList.mutate(list.id)} className="ml-auto rounded-lg border border-white/10 bg-white/5 p-1 text-zinc-400 hover:text-rose-300">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {items.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[.03] px-2.5 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-200">
                          {item.name} <span className="text-zinc-600">× {item.quantity}</span>
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">{item.status}</span>
                        <button
                          onClick={() => search.mutate({ requirement: item.name, budget: item.budget ?? null, agentId: agentId || null, listItemId: item.id })}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/10"
                        >
                          <Search className="h-3 w-3" />Research
                        </button>
                        <button onClick={() => dropItem.mutate(item.id)} className="rounded-lg p-1 text-zinc-500 hover:text-rose-300">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addItem.mutate({ listId: list.id, name: draft });
                      setItemDrafts((d) => ({ ...d, [list.id]: '' }));
                    }}
                  >
                    <input
                      className={input}
                      placeholder="Add an item"
                      value={draft}
                      onChange={(e) => setItemDrafts((d) => ({ ...d, [list.id]: e.target.value }))}
                    />
                    <button type="submit" disabled={!draft.trim()} className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] text-white hover:bg-white/10 disabled:opacity-40">Add</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {agents.length > 0 && (
        <p className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-600">
          <Bot className="h-3 w-3" />Per-agent budgets live on each agent in Personal AI and are enforced alongside these account limits.
        </p>
      )}
    </div>
  );
}
