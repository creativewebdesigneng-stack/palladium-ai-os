# Blackstar visual system — Void Observatory

Chosen direction: **Void Observatory**. Quiet deep-space observation deck. Additive on the existing Blackstar shell. Does not rebuild Mission Control data paths, agents, approvals, MCP, routing, memory, audit or RLS.

## Identity

- Product: **Blackstar**
- Engine: bounded general intelligence / Astra-class
- Do not describe the product as true AGI or claim GPT/OpenAI parity

## Mark

`src/components/blackstar/AstraMark.jsx` plus `public/astra-mark.svg`.

- Void five-point star, metal facet stroke, aperture
- Slow 28s orbital ring (off under `prefers-reduced-motion`)
- Live states: ready, syncing, executing, attention, alert

## Rooms

- Mission Control theatre caption: **Void observatory**
- Shell class: `astra-void-observatory`
- Space field stays visible on every authenticated room
- Scanlines are dim and slow; no theatre tilt

## Depth field

One WebGL context behind the shell. Non-interactive.

## Tokens

- void `#050508`
- ion `#E8E6F0`
- violet `#7B5CFF` (restrained)
- ready amber `#C9A227`
- red stays incident-only

## Honesty

Owner-scoped live data only. This is the first Void Observatory slice, not 100% of the original 3D brief.
