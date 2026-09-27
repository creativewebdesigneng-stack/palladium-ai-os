import { ROOM_LABELS } from './visualRooms'

export default function AstraRoomFrame({ children, room }) {
  const label = ROOM_LABELS[room]
  return (
    <div className="astra-room-frame">
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tr" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-bl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-br" />
      {label ? <p className="astra-room-label px-3 pt-2">{label}</p> : null}
      <div className="px-2 pb-3 pt-1 lg:px-3">{children}</div>
    </div>
  )
}
