import { Plus, LayoutTemplate, Upload } from 'lucide-react';

export default function WorkflowsToolbar({ onCreate, onTemplates, onImport }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <button onClick={onCreate} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-4 w-4" />Create Workflow</button>
      <button onClick={onTemplates} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"><LayoutTemplate className="h-4 w-4" />Templates</button>
      <button onClick={onImport} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"><Upload className="h-4 w-4" />Import</button>
    </div>
  );
}