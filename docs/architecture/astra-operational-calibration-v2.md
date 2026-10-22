# Astra certification v2 — operational cognition calibration

The original general, tool-use and agentic 20-case certification catalogues repeated a single broad prompt under different topic tags. This change introduces 20 distinct PUBLIC calibration scenarios per class, joining the existing v2 reasoning and coding suites.

Now five text task classes have 20 distinct prompts each (100 text cases total); vision remains v1 with 20 existing media cases because its deterministic PNG oracle uses v1 IDs.

The existing owner-scoped run attestation continues to bind suite version, exact prompt, signed execution profile, judge identity and run evidence. Historical v1 text outcomes are not automatically counted toward v2. There are no migrations, model promotions, new provider connections, permission changes or Production rollout.

**Limits:** These are hand-authored public tasks, not secret holdouts or verified successful model outputs. Scoring still requires genuinely executed candidate inference and independent judges. Results against external frontier models require matched conditions, blind challenge data, statistical confidence and independently reproducible grading. Agentic prompts test planning behavior, not real delegated tool execution.

**Gate:** CI with no failures, exact-head READY Vercel Preview and real authenticated end-to-end agent/tool evidence; keep PR #1025 draft and do not merge until parent PR #1022 is landed and acceptance passes.
