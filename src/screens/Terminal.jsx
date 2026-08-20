import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Copy, CornerDownLeft, Loader2, LockKeyhole, ShieldCheck, TerminalSquare, Trash2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { friendlyMessage } from '@/lib/errors';
import { getTerminalStatus, runTerminalCommand } from '@/lib/terminal/terminal.functions';

const HELP = [
  'Allowed diagnostic commands:',
  '  pwd · ls [-flags] [safe path] · whoami · id · date',
  '  uname [-a|-s|-r|-m] · uptime · df [-h] · free [-h|-m] · ps [aux|-ef]',
  '  git/node/npm/python/python3/bun --version',
  '',
  'Blocked: network clients, scripts, pipes, redirects, substitutions and command chaining.',
  'Each command gets a fresh secure E2B sandbox; filesystem state does not persist.',
];

export default function Terminal() {
  const statusFn = useServerFn(getTerminalStatus);
  const runFn = useServerFn(runTerminalCommand);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [stack, setStack] = useState([]);
  const [stackIndex, setStackIndex] = useState(-1);
  const [history, setHistory] = useState([
    { text: 'PalladiumAI isolated diagnostic terminal', tone: 'text-violet-300' },
    { text: 'Type “help” for the allowed command policy. This is never the PalladiumAI host.', tone: 'text-zinc-500' },
  ]);
  const scrollRef = useRef(null);

  const status = useQuery({
    queryKey: ['terminal-status'],
    queryFn: () => statusFn({ data: {} }),
    retry: false,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, pending]);

  const append = (...lines) => setHistory((current) => [...current, ...lines]);

  const submit = async (event) => {
    event.preventDefault();
    const command = input.trim();
    if (!command || pending) return;
    setInput('');
    setStack((current) => [command, ...current].slice(0, 50));
    setStackIndex(-1);

    if (command === 'clear') {
      setHistory([]);
      return;
    }
    if (command === 'help') {
      append({ text: `$ ${command}`, tone: 'text-zinc-300' }, ...HELP.map((text) => ({ text, tone: 'text-zinc-500' })));
      return;
    }

    append({ text: `$ ${command}`, tone: 'text-zinc-300' });
    setPending(true);
    try {
      const result = await runFn({ data: { command } });
      const output = [result.stdout, result.stderr].filter(Boolean).join(result.stdout && result.stderr ? '\n' : '');
      append(
        ...(output ? output.split('\n').map((text) => ({ text, tone: result.exitCode === 0 ? 'text-zinc-400' : 'text-rose-300' })) : [{ text: '(no output)', tone: 'text-zinc-600' }]),
        { text: `[sandbox ${result.sandboxId.slice(0, 10)} · exit ${result.exitCode ?? 'unknown'} · ${result.durationMs} ms]`, tone: 'text-zinc-700' },
      );
    } catch (error) {
      append({ text: friendlyMessage(error), tone: 'text-rose-300' });
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(history.map((line) => line.text).join('\n'));
  };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Terminal"
        description="Authenticated diagnostic commands executed in short-lived secure E2B sandboxes. No command runs on the PalladiumAI server, deployment host or your computer."
      />

      {status.isError && (
        <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/[.06] p-4 text-sm text-rose-100">
          Terminal status could not be loaded: {friendlyMessage(status.error)}
        </div>
      )}

      {status.isSuccess && !status.data.configured && (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-100">E2B sandbox is not configured</p>
              <p className="mt-1 text-xs leading-5 text-amber-100/70">Add the server-side E2B API key in the production environment to enable live isolated commands. The browser never receives that credential.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <TerminalSquare className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold text-white">Isolated diagnostic shell</span>
            {status.data?.configured && <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">E2B ready</span>}
            <div className="ml-auto flex gap-1">
              <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-white"><Copy className="h-3 w-3" />Copy</button>
              <button onClick={() => setHistory([])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-white"><Trash2 className="h-3 w-3" />Clear</button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 font-mono text-[12px] leading-relaxed">
            {history.map((line, index) => <p key={`${index}-${line.text}`} className={`whitespace-pre-wrap ${line.tone}`}>{line.text || '\u00A0'}</p>)}
            {pending && <p className="mt-1 flex items-center gap-2 text-zinc-500"><Loader2 className="h-3 w-3 animate-spin" />Provisioning secure sandbox…</p>}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 px-4 py-3 font-mono text-sm">
            <span className="text-violet-400">$</span>
            <input
              autoFocus
              value={input}
              disabled={pending || status.isLoading || !status.data?.configured}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  const next = Math.min(stackIndex + 1, stack.length - 1);
                  if (stack[next]) { setStackIndex(next); setInput(stack[next]); }
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  const next = stackIndex - 1;
                  setStackIndex(next);
                  setInput(next >= 0 ? stack[next] : '');
                }
              }}
              maxLength={240}
              className="flex-1 bg-transparent text-zinc-200 outline-none placeholder:text-zinc-700 disabled:cursor-not-allowed"
              placeholder={status.data?.configured ? 'type “help” or an allowed diagnostic command…' : 'sandbox unavailable'}
            />
            <CornerDownLeft className="h-3.5 w-3.5 text-zinc-600" />
          </form>
        </section>

        <aside className="space-y-4">
          <Panel title="Safety boundary" icon={ShieldCheck}>
            <ul className="space-y-2 text-[11px] leading-5 text-zinc-500">
              <li>• Fresh secure sandbox for every command.</li>
              <li>• 15-second command timeout; 60-second sandbox lifetime.</li>
              <li>• Output bounded to 20,000 characters.</li>
              <li>• No persistent filesystem or host access.</li>
              <li>• No network clients or arbitrary script execution.</li>
              <li>• Shell operators, redirects and substitutions blocked.</li>
              <li>• Commands are entitlement-limited, usage-recorded and audited.</li>
            </ul>
          </Panel>
          <Panel title="Allowed commands" icon={TerminalSquare}>
            <div className="space-y-1 font-mono text-[11px] leading-5 text-zinc-500">
              {HELP.slice(1, 4).map((line) => <p key={line}>{line.trim()}</p>)}
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-violet-300" />{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
