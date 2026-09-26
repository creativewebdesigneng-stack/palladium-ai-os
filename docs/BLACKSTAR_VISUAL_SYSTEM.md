# Blackstar visual system — Astra layer

This is an additive identity layer on the existing Blackstar shell (`blackstar-*` classes in `src/styles.css`). It does not rebuild Mission Control, agents, approvals, MCP, routing, memory, audit or RLS.

## Identity

- Product: **Blackstar**
- Engine framing: bounded general intelligence / Astra-class engine
- Do not describe the product as true AGI or claim GPT/OpenAI parity

## Mark

`src/components/blackstar/AstraMark.jsx`

- Void five-point star with metal facet stroke
- Central aperture
- 18s orbital ring (disabled under `prefers-reduced-motion`)

Use `AstraWordmark` on access and chrome. Use `AstraMark` on room headers via `PrimarySurfaceFrame`.

## Tokens

Defined in `src/components/blackstar/blackstar-astra.css`:

- void `#07070A`
- ion `#E8E6F0`
- violet `#7B5CFF`
- ready amber `#C9A227`

Violet is current. Amber is judgment. Red remains incident-only.

## Layout primitives already in product

- `PrimarySurfaceFrame` — room header + command-bar slot for actions
- `IntelligenceTile` / `StatusRail` / `SurfaceGrid`
- Existing `blackstar-shell`, sidebar, topbar, spatial field

## Next rooms (do not duplicate systems)

1. Keep Mission Control data paths as they are; only restyle chrome.
2. Put `Authorize` actions into `.astra-command-bar` when a page already has an approval gate.
3. Do not add fabricated globe layers. Owner-scoped goals/runs only.
