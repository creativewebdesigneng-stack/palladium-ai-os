import { useState } from 'react';
import { X, Play, Loader2, Power, ShieldAlert, KeyRound } from 'lucide-react';
import { PERMISSION_META, PLAN_BADGE } from './toolsData';
import { networkCertificationTask, isNetworkCertificationTool } from '@/lib/tools/network-certification-task';
import { Link } from 'react-router-dom';

export default function ToolDetailDrawer({ tool, isAdmin, onClose, onToggle, onRun, selectedAgent, toolPermissions = [], onGovernedReadTest }) {
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [launchingQa, setLaunchingQa] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [qaError, setQaError] = useState('');
  if (!tool) return null;

  const plan = PLAN_BADGE[tool.required_plan] || PLAN_BADGE.free;
  const assignedOverride = toolPermissions.find(p => p.tool === tool.slug && p.agent_id === selectedAgent?.id);
  const manualApprovalBlocked = Boolean(
    (selectedAgent?.requires_approval || tool.requires_approval || assignedOverride?.requires_approval) &&
    !['nango_action', 'integration_action'].includes(tool.slug)
  );
  const qaSupported = isNetworkCertificationTool(tool.slug);
  const qaReady = qaSupported ? networkCertificationTask(tool, selectedAgent, toolPermissions) : null;
  const run = async () => {
    setRunning(true); setError(''); setResult(null);
    try { const r = await onRun(tool, input); setResult(r); }
    catch (e) { setError(e.message || 'Run failed'); }
    finally { setRunning(false); }
  };

  const launchReadTest = async () => {
    if (!qaReady?.eligible || launchingQa || !onGovernedReadTest) return;
    setLaunchingQa(true); setQaResult(null); setQaError('');
    try { setQaResult(await onGovernedReadTest(tool)); }
    catch (e) { setQaError(e.message || 'Agent task could not start'); }
    finally { setLaunchingQa(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0b0c12] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">{tool.name}</h2>
            <p className="text-[11px] text-zinc-500">{tool.category} · {tool.key}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <p className="mt-3 text-xs text-zinc-400">{tool.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${plan.cls}`}>{plan.label} plan</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">{tool.auth_method}</span>
          {(tool.permissions || []).map((p) => {
            const M = PERMISSION_META[p]; if (!M) return null; const I = M.icon;
            return <span key={p} className={`inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] ${M.color}`}><I className="h-3 w-3" />{p}</span>;
          })}
        </div>

        {tool.input_schema && Object.keys(tool.input_schema).length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-[11px] font-medium text-zinc-400">Input schema</p>
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-2 text-[10px] text-zinc-400">{JSON.stringify(tool.input_schema, null, 2)}</pre>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-1 text-[11px] font-medium text-zinc-400">Test input</p>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="JSON or text input for this tool…" className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          {manualApprovalBlocked ? (
            <p className="mt-2 text-[11px] text-amber-300">Manual testing cannot complete an approval-required tool. Use an approved agent task instead; no approval will be bypassed.</p>
          ) : (
            <button onClick={run} disabled={running} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50">
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Run tool
            </button>
          )}
          {error && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400"><ShieldAlert className="h-3.5 w-3.5" />{error}</p>}
          {result !== null && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-emerald-300">{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>

        {qaSupported && (
          <section className="mt-5 space-y-2 rounded-xl border border-violet-300/15 bg-violet-500/[.04] p-3" aria-label="Governed network tool certification">
            <p className="text-xs font-semibold text-violet-100">Governed read-only certification task</p>
            <p className="text-[11px] text-zinc-400">Use the selected active agent to attempt the exact bounded public test through the existing runtime and Approval Centre. The agent model may incur usage charges. You must still approve any queued operation.</p>
            <p className="text-[11px] text-zinc-400">Selected agent: {selectedAgent?.name || 'None selected'}</p>
            {!qaReady?.eligible && <p className="text-[11px] text-amber-300">{qaReady?.reason}</p>}
            <button onClick={launchReadTest} disabled={!qaReady?.eligible || launchingQa || !onGovernedReadTest}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/25 bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40">
              {launchingQa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Start governed agent test
            </button>
            {qaError && <p role="alert" className="text-[11px] text-rose-300">{qaError}</p>}
            {qaResult && <div className="space-y-1 text-[11px] text-zinc-300">
              <p>Agent task response: {qaResult.status}. This does not certify the tool.</p>
              <p>Check the original task, operator approval, tool-execution record and audit evidence before treating it as verified.</p>
              <Link to="/mission-control" className="inline-block text-violet-300 underline">Open Mission Control to review approvals and tasks</Link>
            </div>}
          </section>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="mb-2 text-[11px] font-medium text-zinc-400">Admin controls</p>
          {isAdmin ? (
            <button onClick={() => onToggle(tool, !tool.enabled)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${tool.enabled ? 'border border-rose-400/30 bg-rose-500/10 text-rose-300' : 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'}`}>
              <Power className="h-3.5 w-3.5" />{tool.enabled ? 'Disable tool' : 'Enable tool'}
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><KeyRound className="h-3.5 w-3.5" />Only admins can enable or disable tools.</p>
          )}
        </div>
      </div>
    </div>
  );
}