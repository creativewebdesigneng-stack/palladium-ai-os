import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BookOpen, Inbox, Loader2, MessageSquareText, Plug } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { createSupportInbox, getSupportExtensions, saveCannedResponse, saveSupportArticle } from '@/lib/business/support-extensions.functions';

export default function SupportExtensions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getSupportExtensions);
  const createInboxFn = useServerFn(createSupportInbox);
  const saveArticleFn = useServerFn(saveSupportArticle);
  const saveCannedFn = useServerFn(saveCannedResponse);
  const [tab, setTab] = useState('channels');
  const [inboxName, setInboxName] = useState('');
  const [channel, setChannel] = useState('web');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [cannedName, setCannedName] = useState('');
  const [cannedShortcut, setCannedShortcut] = useState('');
  const [cannedContent, setCannedContent] = useState('');

  const overview = useQuery({ queryKey: ['support-extensions'], queryFn: () => overviewFn(), retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ['support-extensions'] });
  const mutation = (fn, title, clear) => useMutation({
    mutationFn: fn,
    onSuccess: async () => { clear?.(); await refresh(); toast({ title }); },
    onError: (error) => toast({ variant: 'destructive', title: 'Support update failed', description: friendlyMessage(error) }),
  });
  const createInbox = mutation(() => createInboxFn({ data: { name: inboxName, channel } }), 'Support inbox created', () => setInboxName(''));
  const saveArticle = mutation(() => saveArticleFn({ data: { title: articleTitle, slug: slugify(articleTitle), bodyMarkdown: articleBody, locale: 'en', status: 'draft', tags: [] } }), 'Help article saved', () => { setArticleTitle(''); setArticleBody(''); });
  const saveCanned = mutation(() => saveCannedFn({ data: { name: cannedName, shortcut: cannedShortcut, content: cannedContent } }), 'Canned response saved', () => { setCannedName(''); setCannedShortcut(''); setCannedContent(''); });
  const data = overview.data ?? {};

  return <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-violet-400">Omnichannel extensions</p><h2 className="mt-1 text-base font-semibold text-white">Channels, Help Center & reusable replies</h2><p className="mt-1 max-w-3xl text-xs text-zinc-500">Chatwoot-style support capabilities extend the existing PalladiumAI ticket queue. Connected-provider credentials and live external actions stay in Integrations and the agent approval runtime.</p></div>{overview.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div>
    {overview.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(overview.error)}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{[['channels','Channels',Inbox],['help','Help Center',BookOpen],['responses','Canned replies',MessageSquareText]].map(([key,label,Icon]) => <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${tab === key ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : 'border-white/10 text-zinc-400'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>

    {tab === 'channels' && <div className="mt-4"><div className="grid gap-2 md:grid-cols-[1fr_180px_auto]"><input value={inboxName} onChange={(e) => setInboxName(e.target.value)} placeholder="Support inbox name" className={control} /><select value={channel} onChange={(e) => setChannel(e.target.value)} className={control}>{['web','email','chat','phone','whatsapp','facebook','instagram','telegram','line','sms','api','other'].map((item) => <option key={item} value={item}>{item}</option>)}</select><button onClick={() => createInbox.mutate()} disabled={!inboxName.trim() || createInbox.isPending} className={button}>Add inbox</button></div><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(data.inboxes ?? []).map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2"><Inbox className="h-3.5 w-3.5 text-violet-300" /><p className="text-xs font-medium text-white">{item.name}</p></div><p className="mt-1 text-[11px] text-zinc-500">{item.channel} · {item.status}</p></div>)}</div><div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2"><Plug className="h-3.5 w-3.5 text-cyan-300" /><p className="text-xs font-medium text-white">{(data.capabilities ?? []).length} live support integration capabilities</p></div><p className="mt-1 text-[11px] text-zinc-500">Email, WhatsApp, social and messaging actions are discovered from the existing provider-neutral Integrations runtime rather than storing provider credentials here.</p></div></div>}

    {tab === 'help' && <div className="mt-4 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]"><div className="space-y-2"><input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="Help article title" className={control} /><textarea value={articleBody} onChange={(e) => setArticleBody(e.target.value)} rows={6} placeholder="Markdown article content…" className={control} /><button onClick={() => saveArticle.mutate()} disabled={!articleTitle.trim() || saveArticle.isPending} className={button}>Save draft article</button></div><div className="space-y-2">{(data.articles ?? []).length === 0 ? <p className="text-xs text-zinc-600">No help articles yet.</p> : (data.articles ?? []).map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex justify-between gap-2"><p className="text-xs font-medium text-white">{item.title}</p><span className="text-[10px] uppercase text-zinc-500">{item.status}</span></div><p className="mt-1 text-[11px] text-zinc-600">/{item.slug} · {item.locale}</p></div>)}</div></div>}

    {tab === 'responses' && <div className="mt-4 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]"><div className="space-y-2"><input value={cannedName} onChange={(e) => setCannedName(e.target.value)} placeholder="Response name" className={control} /><input value={cannedShortcut} onChange={(e) => setCannedShortcut(e.target.value)} placeholder="/shortcut" className={control} /><textarea value={cannedContent} onChange={(e) => setCannedContent(e.target.value)} rows={5} placeholder="Reusable reply…" className={control} /><button onClick={() => saveCanned.mutate()} disabled={!cannedName.trim() || !cannedShortcut.trim() || !cannedContent.trim() || saveCanned.isPending} className={button}>Save canned response</button></div><div className="space-y-2">{(data.cannedResponses ?? []).length === 0 ? <p className="text-xs text-zinc-600">No canned responses yet.</p> : (data.cannedResponses ?? []).map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-medium text-violet-300">{item.shortcut} · {item.name}</p><p className="mt-1 whitespace-pre-wrap text-xs text-zinc-400">{item.content}</p></div>)}</div></div>}
  </section>;
}

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
const button = 'rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40';
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'article'; }
