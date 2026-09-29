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
- Live states: ready, syncing, executing, attention, alert

Mounted on:

- Public landing, nav, footer
- Auth access node
- Sidebar brand and top-bar posture chip
- `PageHeader` / `PrimarySurfaceFrame`
- Mission Control deck header and holographic core
- Document title in `src/routes/__root.tsx`

## Rooms and visual worlds

`AppShell` assigns both `astra-room-*` environments and one of Blackstar's ten visual worlds by route.

- Mission Control uses `CommandTheatre` plus its live operational topology
- AI Hub uses the live neural capability topology; Agents and Workforce use runtime-backed execution/constellation scenes
- Cinema Studio, Game Foundry, Trading Hub, Finance, Legal, Industry, Company, Website Studio and Marketplace each mount a dedicated flagship world component
- Related secondary routes inherit the matching visual world rather than falling back to a generic SaaS shell
- Creator/video routes use the Cinema room; Search uses the Knowledge room
- Each named room has a wash, scanline, caption and inset
- Heavy ambience follows the adaptive visual-performance budget and pauses off-screen
- CSS/WebGL motion is disabled or reduced under `prefers-reduced-motion`

## Depth field

`src/components/blackstar/AstraDepthField.jsx` — one WebGL context behind the shell.

- Room palettes and distinct core meshes
- Non-interactive; operational UI stays stable
- Mobile particle cap; reduced-motion renders one frame

## Tokens

`src/components/blackstar/blackstar-astra.css`

- void `#07070A`
- ion `#E8E6F0`
- violet `#7B5CFF` (current)
- ready amber `#C9A227` (judgment)
- red stays incident-only

## Honesty

Owner-scoped live data only. No fabricated globe, infrastructure state, market feed or execution state. External writes stay on existing approval gates.

The flagship scene programme is implemented across the major product areas, including the rebuilt Mission Control command room. Remaining visual work is production polish and acceptance: route-by-route visual QA, responsive tuning, performance checks on slower devices, accessibility verification and final operator review.
