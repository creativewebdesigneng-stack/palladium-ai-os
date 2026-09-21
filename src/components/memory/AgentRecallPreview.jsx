import { useState } from 'react';
import { BookOpenCheck, Loader2, SearchCheck } from 'lucide-react';
import { previewAgentMemory } from '@/lib/memory/memory.functions';

const LAYERS = [
  { key: 'shortTerm', title: 'Recent task context' },
  { key: 'longTerm', title: 'Long-term memory' },
  { key: 'organisation', title: 'Organisation knowledge' },
  { key: 'documents', title: 'Document excerpts' },
];

const inputStyle = 'mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-violet-400/60 disabled:opacity-50';

/**
 * Read-only operator check of the same scoped recall service used before an
 * agent run. Does not run a model, save a memory or grant access to an agent.
 */
export default function AgentRecallPreview({ agents = [], disabled = false }) {
  const [agentId, setAgentId] = useState('');
  const [question, setQuestion] = useState('');
  const [inFlight, setInFlight] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const available = !disabled && !inFlight;
  const count = result ? LAYERS.reduce((total, layer) => total + (result.memory[layer.key]?.length ?? 0), 0) : 0;

  async function runPreview(event) {
    event.preventDefault();
    if (!available) return;
    setError('');
    setResult(null);
    const query = question.trim();
    if (query.length < 3 || query.length > 500) {
      setError('Enter a question between 3 and 500 characters.');
      return;
    }
    setInFlight(true);
    try {
      const memory = await previewAgentMemory({ data: { query, agent_id: agentId || undefined } });
      const selected = agents.find((agent) => agent.id === agentId);
      setResult({ memory, query, agentName: selected?.name || 'Personal context' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not check memory recall.');
    } finally {
      setInFlight(false);
    }
  }

  function clearResult() {
    setResult(null);
    setError('');
  }

  return (
    <section className="mt-8 rounded-2xl border border-violet-400/20 bg-black/25 p-4 sm:p-5" aria-labelledby="agent-recall-preview-heading">
      <div className="flex items-center gap-2">
        <BookOpenCheck className="h-5 w-5 text-violet-300" />
        <h2 id="agent-recall-preview-heading" className="text-base font-semibold text-white">Agent memory & knowledge recall check</h2>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">
        Check what the current scoped memory service would retrieve for an agent and a task.
        This is a read-only retrieval preview, not a live AI response, permission test, or proof that an agent has completed a task.
        Only records available under your memory settings and the chosen agent’s scope are eligible.
      </p>
      <form className="mt-4 space-y-3" onSubmit={runPreview}>
        <label className="block text-xs font-medium text-zinc-300">
          Agent context
          <select value={agentId} onChange={(event) => { setAgentId(event.target.value); clearResult(); }} disabled={!available} className={inputStyle}>
            <option value="">Personal context (no specific agent)</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name || 'Unnamed agent'}{agent.memory_enabled === false ? ' — memory disabled' : ''}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-300">
          Task or recall question
          <textarea value={question} maxLength={500} rows={3} onChange={(event) => { setQuestion(event.target.value); clearResult(); }} disabled={!available} className={inputStyle} placeholder="For example: What do I have saved about this project's deployment requirements?" />
          <span className="mt-1 block text-right text-[11px] text-zinc-500">{question.length}/500</span>
        </label>
        <button type="submit" disabled={!available || question.trim().length < 3} className="inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2 text-sm font-semibold text-[#0b0712] hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50">
          {inFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
          {inFlight ? 'Checking authorised memory…' : 'Preview agent recall'}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {result && <div className="mt-5 border-t border-white/10 pt-4" aria-live="polite">
        <h3 className="text-sm font-semibold text-white">{result.agentName} · {count} eligible excerpts</h3>
        <p className="mt-1 text-xs text-zinc-400">Question: {result.query}</p>
        {result.memory.memoryDisabled ? (
          <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-200">This agent has memory disabled. Its actual runtime does not retrieve memory before execution.</p>
        ) : count === 0 ? (
          <p className="mt-3 rounded-lg border border-white/10 p-3 text-sm text-zinc-400">No eligible records were recalled. This can reflect missing data, memory preferences, agent boundaries, expiry, or search relevance; it is not proof that no memory exists.</p>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {LAYERS.filter((layer) => result.memory[layer.key]?.length).map((layer) =>
              <div key={layer.key} className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-3">
                <h4 className="text-xs font-semibold text-violet-200">{layer.title} · {result.memory[layer.key].length}</h4>
                <ol className="mt-2 space-y-2">
                  {result.memory[layer.key].map((entry, index) => <li key={layer.key + index} className="break-words whitespace-pre-wrap rounded-lg bg-white/[.03] p-2 text-xs leading-5 text-zinc-300">{entry}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}
        <p className="mt-3 text-[11px] leading-5 text-zinc-500">The references and saved dates identify past records, not verified current facts or active approvals. The panel keeps the last preview in this browser tab only; changing the selection or question clears it.</p>
      </div>}
    </section>
  );
}
