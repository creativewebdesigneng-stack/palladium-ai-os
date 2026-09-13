# Global Trading Hub completion boundary

Blackstar's Global Trading Hub is complete at the application/control-layer level when the repository, database and deployment checks below are green.

## Operational capabilities

- owner-scoped persistent watchlists
- persistent paper/simulated trades
- structured trading journal
- deterministic position sizing, maximum-loss, return, reward/risk and exposure calculations
- Finance-backed portfolio context without a duplicate holdings store
- Quant Studio strategy/backtest handoff
- source-backed AI market research
- provider-provenanced daily market series and technical indicators when a configured provider supports the requested instrument
- private market-observation alerts with provider/as-of provenance
- official exchange, regulator and central-bank research gateways

## Intentionally provider-gated capabilities

These are not represented as locally executable unless the required authenticated external capability exists:

- real-money broker/exchange execution
- broad-universe live market screeners and ranked movers
- authoritative economic-event calendar feeds
- instruments or venues not covered by the configured market-data provider
- FX conversion of portfolio values without an authenticated FX source

A provider-gated capability must not prevent the local Trading Hub programme from being considered application-complete. It must remain visibly labelled unavailable/provider-gated and must fail closed rather than fabricate data or execution.

## Certification

A completion candidate requires:

1. full Backend Check on the exact PR head
2. exact-head Vercel preview READY
3. /trading-hub HTTP 200
4. no new Trading Hub runtime error cluster after deployment
5. Supabase owner RLS and explicit Data API grants preserved for Trading Hub persistence
6. merge only the certified head
7. production deployment READY and /trading-hub HTTP 200

Do not claim live prices where only daily/provider observations or user-entered values exist. Do not claim broker execution without a real authenticated execution integration.
