import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Eye, EyeOff, Loader2, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { SCENE_PRIMITIVES, addSceneObject, createPrimitive, emptySceneDocument, removeSceneObject, updateSceneObject } from '@/lib/three-d/three-d-scene';
import { deleteThreeDScene, saveThreeDScene } from '@/lib/three-d/three-d-studio.functions';
import ThreeDSceneViewport from '@/components/three-d/ThreeDSceneViewport';

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

function commitNumber(raw) {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function NumberField({ label, value, step = 0.1, onCommit }) {
  return <label className="block">
    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
    <input
      key={`${label}-${value}`}
      type="number"
      step={step}
      defaultValue={value}
      onBlur={(event) => {
        const next = commitNumber(event.target.value);
        if (next == null) {
          event.target.value = String(value);
          return;
        }
        onCommit(next);
      }}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      className={control}
    />
  </label>;
}

function VectorFields({ label, value, step, onCommit }) {
  const axes = ['X', 'Y', 'Z'];
  return <div>
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
    <div className="grid grid-cols-3 gap-2">
      {axes.map((axis, index) => <NumberField key={axis} label={axis} value={value[index]} step={step} onCommit={(next) => {
        const copy = [...value];
        copy[index] = next;
        onCommit(copy);
      }} />)}
    </div>
  </div>;
}

export default function ThreeDSceneEditor({ scene, placement, onPlacementApplied, onSaved, onDeleted, onDirtyChange }) {
  const { toast } = useToast();
  const saveFn = useServerFn(saveThreeDScene);
  const deleteFn = useServerFn(deleteThreeDScene);
  const [draft, setDraft] = useState(scene);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const appliedPlacement = useRef(null);
  const document = draft?.document ?? emptySceneDocument();
  const selected = document.objects.find((object) => object.id === selectedId) ?? null;
  const dirty = scene.readable && (draft.name !== scene.name || draft.description !== scene.description || JSON.stringify(draft.document) !== JSON.stringify(scene.document));

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    setDraft(scene);
    setSelectedId(null);
    setConfirmDelete(false);
  }, [scene.id, scene.updated_at, scene.readable]);

  useEffect(() => {
    if (!placement || !scene.readable || appliedPlacement.current === placement.id) return;
    appliedPlacement.current = placement.id;
    let rejected = false;
    setDraft((current) => {
      const objects = current.document?.objects ?? [];
      if (objects.some((object) => object.id === placement.id)) return current;
      if (objects.length >= 64) {
        rejected = true;
        return current;
      }
      const object = { ...placement, position: [Math.min(objects.length * 1.6, 480), 0, 0] };
      return { ...current, document: addSceneObject(current.document, object) };
    });
    if (rejected) toast({ variant: 'destructive', title: 'This scene already has 64 objects.' });
    else setSelectedId(placement.id);
    onPlacementApplied?.();
  }, [placement, scene.readable, onPlacementApplied, toast]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: draft.id, name: draft.name.trim(), description: draft.description.trim(), document: draft.document } }),
    onSuccess: async (result) => {
      toast({ title: 'Scene saved' });
      await onSaved?.(result.scene);
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Scene could not be saved', description: friendlyMessage(error) }),
  });
  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: scene.id } }),
    onSuccess: async () => {
      toast({ title: 'Scene deleted' });
      await onDeleted?.(scene.id);
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Scene could not be deleted', description: friendlyMessage(error) }),
  });

  function changeDocument(next) {
    setDraft((current) => ({ ...current, document: next }));
  }

  function addKind(kind) {
    const object = createPrimitive(kind, document.objects.length);
    changeDocument(addSceneObject(document, object));
    setSelectedId(object.id);
  }

  function patchSelected(patch) {
    if (!selected) return;
    try { changeDocument(updateSceneObject(document, selected.id, patch)); }
    catch (error) { toast({ variant: 'destructive', title: 'That edit is outside the scene limits', description: friendlyMessage(error) }); }
  }

  if (!scene.readable || !scene.document) {
    return <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-4 text-sm text-rose-100">
      <p>This saved scene could not be read. It was not replaced with an empty scene.</p>
      <button disabled={remove.isPending} onClick={() => remove.mutate()} className="mt-3 rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs text-rose-100">Delete unreadable scene</button>
    </div>;
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div>
      <ThreeDSceneViewport objects={document.objects} selectedId={selectedId} onSelect={setSelectedId} />
      <p className="mt-2 text-[11px] text-zinc-500">Only the objects you add are saved. The grid and lights are editor guides, not scene assets. Imported models are fitted into a one-unit box, and scale is relative to that fit.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SCENE_PRIMITIVES.map((kind) => <button key={kind} onClick={() => addKind(kind)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs capitalize text-zinc-200 hover:border-violet-300/40">{kind}</button>)}
      </div>
    </div>
    <div className="space-y-3">
      <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Scene name</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={control} /></label>
      <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Description</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} className={control} /></label>
      <div className="flex gap-2">
        <button disabled={!dirty || !draft.name.trim() || draft.name.trim().length > 160 || draft.description.trim().length > 2000 || save.isPending} onClick={() => save.mutate()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save scene</button>
        {confirmDelete ? <button disabled={remove.isPending} onClick={() => remove.mutate()} className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-200">Confirm</button> : <button onClick={() => setConfirmDelete(true)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300"><Trash2 className="h-3.5 w-3.5" /></button>}
      </div>
      <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-white/10 bg-black/20 p-2">
        {document.objects.length === 0 ? <p className="px-1 py-3 text-center text-[11px] text-zinc-500">No objects in this scene yet.</p> : document.objects.map((object) => <button key={object.id} onClick={() => setSelectedId(object.id)} className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${object.id === selectedId ? 'bg-violet-500/15 text-white' : 'text-zinc-300 hover:bg-white/[.04]'}`}><span className="truncate">{object.name}</span><span className="ml-2 shrink-0 text-[10px] uppercase text-zinc-500">{object.kind}</span></button>)}
      </div>
      {selected && <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Object name</span><input value={selected.name} onChange={(event) => patchSelected({ name: event.target.value })} className={control} /></label>
        <label className="flex items-center justify-between gap-3 text-xs text-zinc-300"><span>Colour</span><input type="color" value={selected.color} onChange={(event) => patchSelected({ color: event.target.value })} className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent" /></label>
        <VectorFields label="Position" value={selected.position} onCommit={(position) => patchSelected({ position })} />
        <VectorFields label="Rotation" value={selected.rotation} step={1} onCommit={(rotation) => patchSelected({ rotation })} />
        <VectorFields label="Scale" value={selected.scale} onCommit={(scale) => patchSelected({ scale })} />
        <div className="flex gap-2">
          <button onClick={() => patchSelected({ visible: !selected.visible })} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-zinc-300">{selected.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{selected.visible ? 'Visible' : 'Hidden'}</button>
          <button onClick={() => { changeDocument(removeSceneObject(document, selected.id)); setSelectedId(null); }} className="rounded-lg border border-rose-400/20 px-2 py-1.5 text-xs text-rose-200">Remove</button>
        </div>
        {selected.kind === 'model' && <p className="break-all text-[11px] text-zinc-500">Saved file: {selected.sourceUrl}</p>}
      </div>}
    </div>
  </div>;
}
