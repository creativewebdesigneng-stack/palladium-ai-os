import { useRef, useState } from 'react';
import { Upload, X, Loader2, FileJson } from 'lucide-react';

const EXAMPLE = `{
  "name": "Weekly revenue brief",
  "description": "Collects revenue data and emails a summary",
  "trigger_type": "schedule",
  "schedule": "0 9 * * 1",
  "steps": [
    { "kind": "agent", "name": "Gather revenue", "mode": "sequential" },
    { "kind": "notification", "name": "Send brief", "mode": "sequential" }
  ]
}`;

/**
 * Imports a workflow from a JSON definition (pasted or uploaded). Validation is
 * authoritative on the server; this only parses JSON before sending.
 */
export default function ImportWorkflowModal({ open, onClose, onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  if (!open) return null;

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setText(await file.text());
  };

  const submit = async () => {
    setError(null);
    let definition;
    try {
      definition = JSON.parse(text);
    } catch {
      setError('That is not valid JSON. Check for a missing comma or bracket.');
      return;
    }
    setBusy(true);
    try {
      await onImport(definition);
      setText('');
      onClose();
    } catch (e) {
      setError(e?.message || 'The workflow could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d13] p-6 shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500">
            <Upload className="h-4.5 w-4.5 text-white" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Import workflow</h2>
            <p className="text-[11px] text-zinc-500">Paste a JSON definition or upload a .json file.</p>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder={EXAMPLE}
          className="mt-4 h-56 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-3 font-mono text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
        />

        {error && (
          <p className="mt-2 rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-3 py-2 text-[12px] text-rose-200">{error}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
          >
            <FileJson className="h-3.5 w-3.5" /> Choose file
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} />
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-white/10 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
            <button
              onClick={submit}
              disabled={busy || !text.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Import workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
