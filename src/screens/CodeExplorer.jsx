import { useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import CodeTree from '@/components/code-explorer/CodeTree';
import CodePreview from '@/components/code-explorer/CodePreview';
import FindReplace from '@/components/code-explorer/FindReplace';
import GitStatus from '@/components/code-explorer/GitStatus';
import AIActions from '@/components/code-explorer/AIActions';
import FileSearch, { CodeSearch } from '@/components/code-explorer/SearchPanels';
import { FILE_CONTENT, TREE } from '@/components/code-explorer/codeExplorerData';
import { Search, FileSearch as FsIcon, GitBranch, Sparkles } from 'lucide-react';

const RIGHT = [
  { id: 'files', label: 'Files', icon: FsIcon },
  { id: 'code', label: 'Code', icon: Search },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'ai', label: 'AI', icon: Sparkles },
];

function langFor(path) {
  const tree = JSON.stringify(TREE);
  const node = path ? null : null;
  if (!path) return 'react';
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'react';
  if (path.endsWith('.ts')) return 'ts';
  if (path.endsWith('.py')) return 'py';
  if (path.endsWith('.html') || path.endsWith('.svg')) return 'html';
  if (path.endsWith('.md')) return 'markdown';
  return 'react';
}

export default function CodeExplorer() {
  const [active, setActive] = useState('src/components/Button.jsx');
  const [content, setContent] = useState(FILE_CONTENT[active]);
  const [right, setRight] = useState('files');
  const [toast, setToast] = useState(null);

  const select = (path) => {
    if (FILE_CONTENT[path]) { setActive(path); setContent(FILE_CONTENT[path]); }
    else { flash(`"${path}" has no preview yet`); }
  };
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };
  const onAction = (a, target) => {
    if (a === 'Create') flash('Created new file in selection');
    else if (a === 'Rename') flash(`Renamed ${target}`);
    else if (a === 'Delete') flash(`Deleted ${target}`);
    else if (a === 'Duplicate') flash(`Duplicated ${target}`);
    else if (a === 'Move') flash(`Moved ${target}`);
    else if (a === 'Download') flash(`Downloaded ${target}`);
  };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Code Explorer" description="Browse, search, and refactor your project's source tree." />

      <div className="grid h-[620px] gap-3 lg:grid-cols-[230px_1fr_300px]">
        <div className="hidden min-h-0 lg:block"><CodeTree active={active} onSelect={select} onAction={onAction} /></div>
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1"><CodePreview file={active} code={content} lang={langFor(active)} /></div>
          <FindReplace code={content} onReplace={(c) => setContent(c)} />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
          <div className="flex border-b border-white/10">
            {RIGHT.map((r) => { const I = r.icon; return (
              <button key={r.id} onClick={() => setRight(r.id)} className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-[10px] font-medium ${right === r.id ? 'border-b-2 border-violet-400 text-white' : 'text-zinc-400 hover:text-white'}`}><I className="h-3.5 w-3.5" />{r.label}</button>
            ); })}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {right === 'files' && <FileSearch onSelect={select} />}
            {right === 'code' && <CodeSearch onSelect={select} />}
            {right === 'git' && <GitStatus files={TREE} />}
            {right === 'ai' && <AIActions file={active} />}
          </div>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}