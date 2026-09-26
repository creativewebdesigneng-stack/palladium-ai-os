const LABELS = {
  'astra-room-hub': 'Blackstar intelligence hub',
  'astra-room-workforce': 'Blackstar workforce floor',
  'astra-room-finance': 'Blackstar finance floor',
  'astra-room-legal': 'Blackstar legal floor',
  'astra-room-studio': 'Blackstar studio',
  'astra-room-memory': 'Blackstar memory vault',
  'astra-room-admin': 'Blackstar admin',
}

export default function AstraRoomFrame({ children, room }) {
  const label = LABELS[room]
  return (
    <div className="astra-room-frame">
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tr" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-bl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-br" />
      {label ? <p className="astra-room-label px-3 pt-2">{label}</p> : null}
      {children}
    </div>
  )
}
