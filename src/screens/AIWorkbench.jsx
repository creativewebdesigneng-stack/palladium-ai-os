import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ClipboardCopy, Download, Search, Sparkles, TriangleAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { assistantChat } from '@/lib/ai/assistant.functions';
import { friendlyMessage } from '@/lib/errors';
import { AI_WORKBENCH_CATEGORIES, AI_WORKBENCH_TOOLS } from '@/lib/ai-workbench/catalogue';
import { buildAiWorkbenchMessage } from '@/lib/ai-workbench/prompt';

const fieldClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/60 placeholder:text-zinc-600';
const cardClass = 'rounded-2xl border border-violet-300/10 bg-black/35 p-4 sm:p-5';

export default function AIWorkbench() {
  const askAssistant = useServerFn(assistantChat);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(AI_WORKBENCH_TOOLS[0].id);
  const [source, setSource] = useState('');
  const [guidance, setGuidance] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = AI_WORKBENCH_TOOLS.find((tool) => tool.id === selectedId) || AI_WORKBENCH_TOOLS[0];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return AI_WORKBENCH_TOOLS.filter((tool) =>
      (category === 'all' || tool.category === category)
      && (!needle || [tool.name, tool.description, tool.instruction, tool.category].some((part) => part.toLowerCase().includes(needle))),
    );
  }, [query, category]);

  function selectTool(id) {
    if (running || id === selectedId) return;
    if ((source.trim() || guidance.trim() || result) && !window.confirm('Switch tools? This clears the current text and AI result from this tab. Copy or download your output first.')) return;
    setSelectedId(id);
    setSource('');
    setGuidance('');
    setResult(null);
    setError('');
    setNotice('');
  }

  async function runTool() {
    if (running) return;
    setError('');
    setNotice('');
    let message;
    try {
      message = buildAiWorkbenchMessage(selected, source, guidance);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Check your input.');
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const response = await askAssistant({ data: { message, history: [] } });
      if (!response?.text?.trim()) throw new Error('The AI model returned an empty response.');
      setResult({ text: response.text, model: response.model, provider: response.provider, name: selected.name });
    } catch (requestError) {
      setError(friendlyMessage(requestError));
    } finally {
      setRunning(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setNotice('AI draft copied. Review and verify it before use.');
      setError('');
    } catch {
      setError('Clipboard access failed. Select the result text to copy it manually.');
    }
  }

  function downloadResult() {
    if (!result) return;
    const file = new Blob([result.name + '\n\n' + result.text + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'blackstar-ai-' + selected.id + '.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Text draft prepared for download. It is not a completed external action.');
  }

  return (
    <>
      <PageHeader eyebrow="Blackstar · AI-powered workbench" title="AI Workbench" description="160 user-invoked writing, analysis, learning and planning tools. Each sends your request to Blackstar's existing live AI assistant model and returns a reviewable text result." />
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-4 py-3 text-xs leading-5 text-amber-100/85">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>These 160 AI text workflows are separate from the agent-executable Tools Framework and from the 160 manual Human Frontier tools. They generate drafts and analyses; they do not send messages, access private files, make purchases, run code or certify outcomes. Do not paste passwords or unnecessary personal information. Verify AI output before use. Inputs and results remain in this tab; the request itself is processed by the existing authenticated AI service under your plan's usage limits.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(250px,320px)_minmax(0,1fr)]">
        <section className={cardClass + ' min-w-0'} aria-label="AI tool catalogue">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-base font-semibold text-white">Explore {AI_WORKBENCH_TOOLS.length} AI tools</h2><span className="text-xs text-zinc-500">{filtered.length} shown</span></div>
          <label className="relative block"><span className="sr-only">Search AI tools</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500" /><input className={fieldClass + ' pl-9'} placeholder="Search AI tools" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="mt-3 block text-xs text-zinc-400">Category<select className={fieldClass + ' mt-1'} value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{AI_WORKBENCH_CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
          <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((tool) => <button key={tool.id} type="button" aria-pressed={selected.id === tool.id} disabled={running} onClick={() => selectTool(tool.id)} className={'w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:opacity-60 ' + (selected.id === tool.id ? 'border-violet-400/45 bg-violet-500/10' : 'border-white/10 bg-white/[.02] hover:border-white/25')}><span className="block text-sm font-medium text-white">{tool.name}</span><span className="mt-1 block text-xs text-zinc-500">{tool.category}</span></button>)}
            {!filtered.length && <p className="p-4 text-sm text-zinc-500">No matches. Try a different search or category.</p>}
          </div>
        </section>
        <section className={cardClass + ' min-w-0'} aria-label="Selected AI tool">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-violet-400/10 p-2 text-violet-200"><Sparkles className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-wider text-violet-300/80">{selected.category} · AI-generated text</p><h2 className="mt-1 text-xl font-semibold text-white">{selected.name}</h2></div></div>
          <p className="mt-4 text-sm leading-6 text-zinc-300">{selected.instruction}</p>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[.02] p-3 text-xs text-zinc-400"><span className="font-medium text-zinc-300">Output:</span> {selected.deliverable}</div>
          <label className="mt-5 block text-sm font-medium text-zinc-200">Your text, brief, notes or question<textarea className={fieldClass + ' mt-2 min-h-[180px] resize-y'} value={source} maxLength={2400} onChange={(event) => setSource(event.target.value)} placeholder="Paste material you are authorised to share, or describe what you want the AI to work on." disabled={running} /><span className="mt-1 block text-right text-xs text-zinc-500">{source.length}/2400</span></label>
          <label className="mt-3 block text-sm font-medium text-zinc-200">Optional guidance<textarea className={fieldClass + ' mt-2 min-h-[70px] resize-y'} value={guidance} maxLength={350} onChange={(event) => setGuidance(event.target.value)} placeholder="Audience, style, constraints or format preferences (optional)." disabled={running} /><span className="mt-1 block text-right text-xs text-zinc-500">{guidance.length}/350</span></label>
          <button type="button" onClick={runTool} disabled={running || !source.trim()} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-300 px-5 py-2.5 text-sm font-semibold text-[#09070d] hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" />{running ? 'Generating with AI…' : 'Run AI tool'}</button>
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.06] p-3 text-sm text-rose-200">{error}</p>}
          {notice && <p role="status" className="mt-4 text-xs text-emerald-300">{notice}</p>}
          {result && <div className="mt-6 border-t border-white/10 pt-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-base font-semibold text-white">AI-generated draft</h3><p className="mt-1 text-xs text-zinc-500">Generated by {result.provider} · {result.model}. Review facts and suitability before use.</p></div><div className="flex gap-2"><button type="button" onClick={copyResult} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"><ClipboardCopy className="h-3.5 w-3.5" /> Copy</button><button type="button" onClick={downloadResult} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"><Download className="h-3.5 w-3.5" /> Download</button></div></div><div className="mt-4 max-h-[680px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-zinc-200">{result.text}</div></div>}
        </section>
      </div>
    </>
  );
}
