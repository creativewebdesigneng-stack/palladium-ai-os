import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PRIORITY_STYLE, STATUS_STYLE, KANBAN_COLUMNS } from './tasksData';

const COL_ACCENT = {
  'To Do': 'border-t-zinc-500', Queued: 'border-t-zinc-400', Running: 'border-t-emerald-500',
  Waiting: 'border-t-amber-500', Review: 'border-t-violet-500', Completed: 'border-t-cyan-500',
  Failed: 'border-t-rose-500', Cancelled: 'border-t-zinc-600',
};

function MiniCard({ task, onOpen, provided }) {
  const ps = PRIORITY_STYLE[task.priority];
  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      onClick={() => onOpen(task)}
      className="group cursor-pointer rounded-xl border border-white/10 bg-[#14151d]/80 p-3 shadow-sm backdrop-blur hover:border-violet-400/40 hover:bg-white/[.06]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-white">{task.name}</p>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ps.dot}`} title={task.priority} />
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{task.description}</p>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[10px] text-zinc-400">{task.agent}</span>
        <span className="text-[10px] text-zinc-600">{task.dueDate}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${task.progress}%` }} />
      </div>
    </div>
  );
}

export default function TaskKanban({ tasks, onOpen, onMove }) {
  const onDragEnd = (res) => {
    if (!res.destination) return;
    const id = res.draggableId;
    const dest = KANBAN_COLUMNS[res.destination.index];
    if (dest) onMove(id, dest);
  };

  return (
    <div className="overflow-x-auto pb-2">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {KANBAN_COLUMNS.map(col => {
            const items = tasks.filter(t => t.status === col);
            const ss = STATUS_STYLE[col];
            return (
              <Droppable key={col} droppableId={col}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`w-72 shrink-0 rounded-2xl border border-white/10 border-t-2 ${COL_ACCENT[col]} bg-white/[.02] p-3`}
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <ss.icon className={`h-3.5 w-3.5 ${ss.text}`} />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{col}</h3>
                      </div>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((t, i) => (
                        <Draggable key={t.id} draggableId={t.id} index={i}>
                          {(p) => <MiniCard task={t} onOpen={onOpen} provided={p} />}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <p className="py-6 text-center text-[11px] text-zinc-600">Drop tasks here</p>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}