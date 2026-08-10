import { Star, Download, Bookmark, Share2 } from 'lucide-react';

export function Stars({ rating, className = 'h-3 w-3' }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      <Star className={`${className} fill-current`} />
      <span className="text-zinc-400">{rating}</span>
    </span>
  );
}

export function Avatar({ name, grad, size = 'h-7 w-7 text-[10px]' }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-lg bg-gradient-to-br ${grad} font-semibold text-white`}>
      {name.split(' ').map(w => w[0]).slice(0, 2).join('')}
    </span>
  );
}

export function PriceButton({ price, onClick, className = '' }) {
  const isFree = price === 'Free';
  return (
    <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${isFree ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30 hover:opacity-90'} ${className}`}>
      {isFree ? 'Install' : price}
    </button>
  );
}

export function IconBtn({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} title={label} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function CardActions({ onSave, onShare }) {
  return (
    <div className="flex gap-1.5">
      <IconBtn icon={Bookmark} label="Save" onClick={onSave} />
      <IconBtn icon={Share2} label="Share" onClick={onShare} />
    </div>
  );
}

export function DownloadCount({ downloads }) {
  return (
    <span className="flex items-center gap-1 text-zinc-500">
      <Download className="h-3 w-3" />{downloads}
    </span>
  );
}