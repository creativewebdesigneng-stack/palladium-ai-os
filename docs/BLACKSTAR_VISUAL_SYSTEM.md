# Blackstar visual system — Astra layer

Additive identity on the existing Blackstar shell. Does not rebuild Mission Control data paths, agents, approvals, MCP, routing, memory, audit or RLS.

## Identity

- Product: **Blackstar**
- Engine: bounded general intelligence / Astra-class
- Do not describe the product as true AGI or claim GPT/OpenAI parity

## Mark

`src/components/blackstar/AstraMark.jsx` plus `public/astra-mark.svg` for the tab icon.

- Void five-point star, metal facet stroke, aperture
- 18s orbital ring (off under `prefers-reduced-motion`)

Mounted on:

- Public landing, nav, footer
- Auth access node
- Sidebar brand and top-bar posture chip
- `PageHeader` / `PrimarySurfaceFrame`
- Mission Control deck header and holographic core
- Document title in `src/routes/__root.tsx`

## Tokens

`src/components/blackstar/blackstar-astra.css`

- void `#07070A`
- ion `#E8E6F0`
- violet `#7B5CFF` (current)
- ready amber `#C9A227` (judgment)
- red stays incident-only

`AppShell` tints the existing spatial field by route (`astra-room-*`).

## Honesty

Owner-scoped live data only. No fabricated globe or market feed. External writes stay on existing approval gates.
