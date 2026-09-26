export default function CommandTheatre({ children }) {
  return (
    <div className="astra-command-theatre astra-room-mission">
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-tr" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-bl" />
      <span aria-hidden className="astra-theatre-corner astra-theatre-corner-br" />
      <p className="astra-room-label px-3 pt-2">Blackstar mission theatre</p>
      {children}
    </div>
  );
}
