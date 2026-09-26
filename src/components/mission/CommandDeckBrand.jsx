import { AstraMark } from '@/components/blackstar/AstraMark'

export default function CommandDeckBrand({ state = 'ready' }) {
  return (
    <div className="flex items-center gap-3">
      <AstraMark size={28} state={state} title="Blackstar Mission Control" />
      <div>
        <p className="astra-room-label text-violet-300/80">Blackstar operations</p>
        <h1 className="text-sm font-semibold tracking-[0.12em] text-white">MISSION CONTROL</h1>
      </div>
    </div>
  )
}
