import { Phone, Mail, Calendar, StickyNote, ListChecks, X, Building2 } from 'lucide-react';
import { CONTACT_STATUS, ACTIVITY_TYPE, AI_SCORE_GRADIENT } from './crmData';

const STATUS_LABEL = { hot: 'Hot', warm: 'Warm', cold: 'Cold', customer: 'Customer' };
const ACT_ICONS = { Phone, Mail, Calendar, StickyNote, ListChecks };

export default function ContactDetailDrawer({ contact, activities, notes, onClose, onAIFeature }) {
  if (!contact) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40 text-sm font-semibold text-white">{contact.name.split(' ').map((n) => n[0]).join('')}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{contact.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-zinc-400"><Building2 className="h-3 w-3" />{contact.company}</p>
          </div>
          <span className={`rounded-full border px-2 py-px text-[10px] font-medium ${CONTACT_STATUS[contact.status]}`}>{STATUS_LABEL[contact.status]}</span>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">AI Lead Score</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-white">{contact.score}</p>
              <div className="h-2 flex-1 rounded-full bg-white/5"><div className={`h-2 rounded-full bg-gradient-to-r ${AI_SCORE_GRADIENT(contact.score)}`} style={{ width: `${contact.score}%` }} /></div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Details</p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2 text-zinc-300"><Mail className="h-3.5 w-3.5 text-sky-400" />{contact.email}</div>
              <div className="flex items-center gap-2 text-zinc-300"><Phone className="h-3.5 w-3.5 text-emerald-400" />{contact.phone}</div>
              <div className="flex items-center gap-2 text-zinc-300"><Building2 className="h-3.5 w-3.5 text-violet-400" />Owner: {contact.owner}</div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Notes</p>
            <p className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-[12px] text-zinc-300">{contact.notes}</p>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Activities</p>
            <div className="space-y-2">
              {activities.map((a) => { const I = ACT_ICONS[ACTIVITY_TYPE[a.type].icon]; return (
                <div key={a.id} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ACTIVITY_TYPE[a.type].tone}`}><I className="h-3.5 w-3.5" /></span>
                  <div><p className="text-[12px] text-zinc-200">{a.summary}</p><p className="text-[10px] text-zinc-500">{a.when} · {a.contact}</p></div>
                </div>
              ); })}
            </div>
          </div>

          {notes.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Internal Notes</p>
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <p className="text-[12px] text-zinc-200">{n.text}</p>
                    <p className="mt-1 text-[10px] text-zinc-500">{n.author} · {n.when}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => onAIFeature?.('research', contact)} className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5">AI Research</button>
            <button onClick={() => onAIFeature?.('followup', contact)} className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5">AI Follow-Up</button>
            <button onClick={() => onAIFeature?.('email', contact)} className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5">AI Email</button>
          </div>
        </div>
      </div>
    </div>
  );
}