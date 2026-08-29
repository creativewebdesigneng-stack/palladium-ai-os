# OpenGameTools + MagicaVoxel MCP capability integration

Date: 2026-08-29

## Decision

The two audited source projects overlap around MagicaVoxel/VOX asset workflows. PalladiumAI therefore integrates the useful capability as one native `voxel_studio` tool instead of adding two parallel runtimes, a second MCP stack, or a separate voxel application page.

## Existing PalladiumAI systems reused

- Agent Runtime / Harness remains the execution and policy boundary.
- The existing Tools Framework catalogue and `tool_permissions` remain the entitlement system.
- Existing `tool_executions` telemetry remains the audit trail.
- Existing MCP infrastructure remains the interoperability layer; no dedicated Python MCP process is required for this capability.
- Existing agent configuration continues to opt agents into `voxel_studio` through `allowed_tools`.

## Native capability added

`voxel_studio` supports bounded, structured operations:

- `create`: encode a MagicaVoxel VOX model from structured voxel JSON.
- `inspect`: parse a base64 VOX payload and report dimensions, voxel count, palette usage and a bounded sample.
- `merge`: merge up to 16 VOX models with non-negative offsets and deterministic overwrite semantics.
- `mesh`: convert a bounded VOX model to an exposed-face Wavefront OBJ mesh for downstream game/app workflows.

The implementation enforces a 256-voxel axis bound, 100,000-voxel general bound, 4 MiB decoded VOX input bound, and a tighter 10,000-voxel mesh-export bound. It rejects malformed chunk bounds, invalid coordinates, duplicate input coordinates and oversized operations.

## Security and architecture boundaries

The integration accepts structured JSON and base64 bytes only. It does not accept arbitrary server filesystem paths, invoke a shell, launch MagicaVoxel, start a second MCP/runtime service, or introduce a new credential store. Generated VOX/OBJ data is returned as bounded base64 output through the existing tool execution path.

This keeps the capability inside PalladiumAI's existing policy and telemetry choke points instead of importing a standalone agent runtime or desktop-control bridge.

## Database/UI impact

A backwards-compatible catalogue migration upserts `voxel_studio` into the existing `public.tools` table. No new database table is required.

No new top-level page is required. Users and agents access the capability through the existing Tools Framework, agent tool configuration and MCP/runtime surfaces, avoiding duplicate navigation and state management.

## Source-integration boundary

The implementation is a native PalladiumAI capability informed by the audited projects' useful VOX workflow concepts. It does not vendor their full runtimes or copy in unrelated subsystems. This deliberately minimizes dependency and licensing surface while retaining the functionality that fits PalladiumAI's architecture.
