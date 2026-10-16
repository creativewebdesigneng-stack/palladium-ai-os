# Agent list configuration and activity evidence

The production QA acceptance check saved `memory_enabled=false`, no tools and approval-required execution correctly. The agent list still read the wizard's `preferences.memory` object as a boolean, so it could display memory as enabled. It also used edit/creation timestamps when no run timestamp existed and substituted a zero performance score when no score was recorded.

The existing list now reads the canonical memory flag, matching the runtime's existing default. Last run uses only a valid `last_run_at`. Missing or invalid performance values display an em dash; an explicitly recorded zero remains zero. No records, permissions, execution controls or database schema are changed.

Four regression tests cover canonical memory-off persistence with legacy preferences, the runtime default, absent/invalid versus recorded run timestamps, and unavailable versus explicitly recorded performance. Build, TypeScript and full application tests are required before merge; exact CI and deployment evidence is recorded on the pull request.

## Integration checkpoint

Connected Supabase read-only verification reconfirmed 176 scientific references (120 ok, 7 warning, 49 dangerous) and one Diagram Design guide (ok). All remain disabled, with no declared tool or script dependencies. The missing scientific reference is `statistical-power`; preparation/scanning evidence does not constitute a completed authenticated import.

The deployed privileged Supabase key remains the blocker for required audit writes, the final importer and live model execution. The connected tool surface exposes publishable keys but no privileged key creation/replacement operation. Existing Vercel integration authorization failures are not retried unchanged, and no browser Supabase authentication is attempted. Repair requires a valid project secret key to be securely synchronized into the existing Vercel integration/deployment, followed by redeployment and authenticated acceptance checks. No JWT signing keys or user sessions need to be changed for this application-key repair.

OpenViking, AgentMemory and Browser Use external-service acceptance requirements remain as documented in `2026-10-15-archive-navigation-and-harness-audit.md`. Both Harness Engineering collections inform the existing runtime and negative-path checks; they are not separate executable engines or independently benchmarked deployments. No service connection or archive execution is claimed by this display fix.
