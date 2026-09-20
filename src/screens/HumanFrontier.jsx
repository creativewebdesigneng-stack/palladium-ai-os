import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCopy, Download, Hand, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { HUMAN_FRONTIER_TOOLS } from '@/lib/human-frontier/registry';

const categories = ['All', 'Everyday life', 'People & community', 'Making & learning', 'Judgement & safety'];
const inputClass = 'mt-2 min-h-[96px] w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-violet-300/50 placeholder:text-zinc-600';

function buildWorksheet(tool, answers, checks) {
  const completed = checks.every(Boolean) && answers.every((answer) => answer.trim());
  const lines = [
    '# Blackstar Human Frontier — ' + tool.name,
    '',
    'Status: ' + (completed ? 'Self-reported steps completed' : 'Draft; actions and/or answers still outstanding'),
    'This note contains only user-entered information and user-selected checkboxes. Blackstar has not independently verified any action, observation, consent or outcome.',
    '',
    'Purpose: ' + tool.purpose,
    'Human action: ' + tool.humanAction,
    'Intended output: ' + tool.output,
    '',
    '## My observations and choices',
  ];
  tool.fields.forEach((field, index) => {
    lines.push('', field.label + ':', answers[index].trim() || '[Not entered]');
  });
  lines.push('', '## Human-led steps (self-reported)');
  tool.checks.forEach((step, index) => lines.push((checks[index] ? '[x] ' : '[ ] ') + step));
  lines.push('', 'Prepared locally by the user; no AI execution or third-party verification is implied.');
  return lines.join('\n');
}

export default function HumanFrontier() {
  const [selectedId, setSelectedId] = useState(HUMAN_FRONTIER_TOOLS[0].id);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [answers, setAnswers] = useState(['', '', '']);
  const [checks, setChecks] = useState([false, false, false]);
  const [copyStatus, setCopyStatus] = useState('');
  const tool = HUMAN_FRONTIER_TOOLS.find((item) => item.id === selectedId) || HUMAN_FRONTIER_TOOLS[0];
  const filtered = useMemo(() => HUMAN_FRONTIER_TOOLS.filter((item) => {
    const categoryMatch = category === 'All' || item.category === category;
    const text = [item.name, item.purpose, item.humanAction, item.category].join(' ').toLowerCase();
    return categoryMatch && text.includes(query.trim().toLowerCase());
  }), [category, query]);
  const completed = checks.every(Boolean) && answers.every((value) => value.trim().length > 0);
  const started = checks.some(Boolean) || answers.some((value) => value.trim().length > 0);

  function chooseTool(id) {
    if (id === selectedId) return;
    if (started && !window.confirm('Switch tools? The unfinished worksheet in this tab will be cleared. Download it first if you want to keep it.')) return;
    setSelectedId(id);
    setAnswers(['', '', '']);
    setChecks([false, false, false]);
    setCopyStatus('');
  }

  function reset() {
    if (started && !window.confirm('Clear this worksheet? Download it first if you want to keep it.')) return;
    setAnswers(['', '', '']);
    setChecks([false, false, false]);
    setCopyStatus('');
  }

  async function copyWorksheet() {
    try {
      await navigator.clipboard.writeText(buildWorksheet(tool, answers, checks));
      setCopyStatus('Copied to clipboard');
    } catch {
      setCopyStatus('Clipboard unavailable. Download your worksheet instead.');
    }
  }

  function downloadWorksheet() {
    const blob = new Blob([buildWorksheet(tool, answers, checks)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'blackstar-human-frontier-' + tool.id + '.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Blackstar · User-controlled tools" title="Human Frontier" description="160 practical workflows built around human observation, consent, hands-on practice and personal decisions. AI can guide you, but it cannot complete these real-world steps on your behalf." />

      <div className="flex items-start gap-3 rounded-2xl border border-violet-300/20 bg-violet-500/[.06] p-4">
        <Hand aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
        <div>
          <p className="text-sm font-semibold text-white">You control every action and every answer.</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">These are manual, user-authored tools, not agent-executable capabilities. Worksheets stay in this browser tab until you explicitly copy or download them; switching or refreshing clears unfinished work. Checkboxes are your own reports, not proof that an action occurred. Do not enter passwords, precise private addresses or unnecessary details about other people.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)]">
        <section className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-4" aria-label="Available Human Frontier tools">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">Explore {HUMAN_FRONTIER_TOOLS.length} tools</h2>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">{filtered.length} shown</span>
          </div>
          <label className="relative mt-4 block">
            <span className="sr-only">Search Human Frontier tools</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input className="w-full rounded-xl border border-white/10 bg-white/[.03] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-violet-400/50" placeholder="Search by problem or activity" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Filter tool categories">
            {categories.map((item) => <button key={item} onClick={() => setCategory(item)} aria-pressed={item === category} className={'rounded-full border px-2.5 py-1.5 text-xs transition ' + (category === item ? 'border-violet-300/50 bg-violet-400/15 text-violet-100' : 'border-white/10 text-zinc-400 hover:text-white')}>{item}</button>)}
          </div>
          <div className="mt-4 max-h-[760px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((item) => <button key={item.id} type="button" aria-pressed={item.id === selectedId} onClick={() => chooseTool(item.id)} className={'w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ' + (item.id === selectedId ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[.02] hover:border-white/20 hover:bg-white/[.05]')}>
              <span className="text-[10px] uppercase tracking-wider text-violet-300/80">{item.category}</span>
              <span className="mt-1 block text-sm font-semibold text-white">{item.name}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-400">{item.purpose}</span>
            </button>)}
            {filtered.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">No tools match this search. Try a different phrase or category.</p>}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6" aria-labelledby="frontier-tool-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><span className="text-[10px] uppercase tracking-[.18em] text-violet-300">{tool.category}</span><h2 id="frontier-tool-title" className="mt-1 text-2xl font-semibold text-white">{tool.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{tool.purpose}</p></div>
            <span className={'rounded-full border px-3 py-1 text-xs ' + (completed ? 'border-emerald-400/30 text-emerald-300' : 'border-white/10 text-zinc-400')}>{completed ? 'Self-reported complete' : started ? 'Worksheet in progress' : 'Ready to begin'}</span>
          </div>
          <div className="mt-5 flex gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-3">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            <p className="text-xs leading-5 text-zinc-300"><strong className="text-white">The human step:</strong> {tool.humanAction}</p>
          </div>
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">1. Record what you actually did, noticed or chose</h3>
            {tool.fields.map((field, index) => <label key={field.label} className="block text-sm text-zinc-200">
              <span className="font-medium">{field.label}</span>
              <textarea maxLength={1500} value={answers[index]} placeholder={field.hint} onChange={(event) => setAnswers((current) => current.map((value, i) => i === index ? event.target.value : value))} className={inputClass} />
              <span className="block text-right text-[10px] text-zinc-600">{answers[index].length}/1500</span>
            </label>)}
          </div>
          <fieldset className="mt-7 rounded-xl border border-white/10 bg-white/[.02] p-4">
            <legend className="px-1 text-sm font-semibold text-white">2. Mark only human steps you actually completed</legend>
            <p className="mb-3 text-xs leading-5 text-zinc-500">You can leave these unchecked and export an honest draft. Never check a step as a prediction.</p>
            <div className="space-y-3">{tool.checks.map((step, index) => <label key={step} className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-zinc-300"><input type="checkbox" checked={checks[index]} onChange={(event) => setChecks((current) => current.map((value, i) => i === index ? event.target.checked : value))} className="mt-1 h-4 w-4 shrink-0 accent-violet-400" /><span>{step}</span></label>)}</div>
          </fieldset>
          <div className="mt-6 rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-4">
            <div className="flex items-start gap-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 text-emerald-300" /><div><p className="text-sm font-semibold text-white">3. Create your own result</p><p className="mt-1 text-xs leading-5 text-zinc-400">Output: {tool.output}. The downloaded note includes the exact answers and self-reported steps above. No AI-generated observations, external verification, third-party contact or automated side effects.</p></div></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadWorksheet} className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#09070d] hover:bg-violet-300"><Download className="h-4 w-4" /> Download {completed ? 'completed' : 'draft'} note</button>
            <button type="button" onClick={copyWorksheet} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5"><ClipboardCopy className="h-4 w-4" /> Copy note</button>
            <button type="button" onClick={reset} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:text-white">Clear</button>
          </div>
          {copyStatus && <p role="status" className="mt-3 text-xs text-zinc-300">{copyStatus}</p>}
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-500"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Works without connecting agents, giving Blackstar permission to act, or submitting personal notes to the server. Some human actions may require another person’s consent or qualified professional help.</p>
        </section>
      </div>
    </div>
  );
}
