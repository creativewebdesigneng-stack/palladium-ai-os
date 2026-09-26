export default function AstraRoomFrame({ children }) {
  return (
    <div className="astra-room-frame">
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tr" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-bl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-br" />
      {children}
    </div>
  );
}
