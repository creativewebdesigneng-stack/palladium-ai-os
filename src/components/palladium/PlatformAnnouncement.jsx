import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { getPlatformAnnouncement } from '@/lib/platform/platform-settings.functions';

const TONES = {
  info: { box: 'border-sky-400/20 bg-sky-400/[.06] text-sky-100', Icon: Info },
  warning: { box: 'border-amber-400/20 bg-amber-400/[.06] text-amber-100', Icon: AlertTriangle },
  critical: { box: 'border-rose-400/25 bg-rose-400/[.07] text-rose-100', Icon: ShieldAlert },
};

export default function PlatformAnnouncement() {
  const fn = useServerFn(getPlatformAnnouncement);
  const q = useQuery({
    queryKey: ['platform-announcement'],
    queryFn: () => fn(),
    retry: false,
    staleTime: 30000,
  });

  if (!q.data?.enabled || !q.data.text) return null;
  const tone = TONES[q.data.tone] || TONES.info;
  const Icon = tone.Icon;
  return (
    <div className={`mb-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${tone.box}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-5">{q.data.text}</p>
    </div>
  );
}
