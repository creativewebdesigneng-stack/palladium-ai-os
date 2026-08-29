# 2026-08-29 source capability integration audit

This batch audits seven upstream projects against PalladiumAI before implementation. The goal is capability integration, not source-tree transplantation: existing PalladiumAI authentication, RLS, approvals, audit telemetry, provider abstractions and pages remain authoritative.

## changedetection.io

Useful capabilities: scheduled web monitoring, text/visual change detection, filters/selectors, browser-assisted checks and notifications.

PalladiumAI mapping: **Web Intelligence**. PalladiumAI already has persisted web jobs, snapshots/change tracking, browser-runtime reuse and SSRF protections. No second monitoring database or page is introduced. Future filter/notification depth should extend the existing web-intelligence contracts.

## Open Interpreter

Useful capabilities: natural-language computer/code execution, tool-oriented execution and local-computer workflows.

PalladiumAI mapping: **Agent Runtime + Terminal + Computer Control**. PalladiumAI already routes execution through explicit tool policy, approvals, sandbox profiles, credential blocking and audit telemetry. The Open Interpreter execution model is therefore treated as capability inspiration/compatibility rather than a parallel unrestricted interpreter runtime.

## PinchTab

Useful capabilities: compact browser control over HTTP/MCP, persistent Chrome sessions and agent-friendly browser actions.

PalladiumAI mapping: **Browser Preview + Browser Runtime + MCP Hub**. Browser sessions, domain restrictions, permissions and telemetry remain under PalladiumAI's existing browser safety boundary. A second browser-session store is intentionally not created.

## Understand Anything

Useful capabilities: repository static analysis, dependency mapping, code graph/context and impact understanding.

PalladiumAI mapping: **Code Explorer + Knowledge**. This batch adds bounded repository intelligence directly to Code Explorer using the existing read-only GitHub App connection. It recursively indexes a bounded source set, extracts JS/TS-family imports, resolves local dependency edges and reports impact hotspots. No repository write permission, duplicate credential store or source copy is created.

## Plausible Analytics (`analytics-master`)

Useful capabilities: privacy-first web/product analytics and understandable traffic reporting.

PalladiumAI mapping: **Product Analytics**. PalladiumAI already has native projects, events, visitors, sessions, revenue, funnels, experiments and per-project write keys. The upstream server is AGPL, so PalladiumAI does not copy its server implementation. Useful reporting concepts should be implemented natively on PalladiumAI's existing analytics schema and RLS.

## Kronos

Useful capabilities: financial candlestick/time-series forecasting with a specialist model.

PalladiumAI mapping: **Quant Studio + model/provider runtime**. Quant Studio already stores strategies and deterministic backtests while explicitly avoiding fabricated market data or direct trading. Kronos should be exposed as an optional specialist forecast provider when its model service is deployed; PalladiumAI must not silently substitute generated prices when that provider is absent.

## ValueCell

Useful capabilities: multi-agent financial research and investment-analysis workflows.

PalladiumAI mapping: **Finance + Quant Studio + Agent Runtime/Workforce**. PalladiumAI already owns agent orchestration, permissions, memory, provider routing and financial workspace surfaces. ValueCell-style research roles therefore compose those systems instead of adding a second agent framework.

## Result

No new top-level page or database was required for this batch. Six sources map onto systems already present on `main`; the material uncovered product gap was repository dependency/impact intelligence, implemented inside Code Explorer. Optional upstream runtimes (for example a deployed Kronos service) remain provider adapters rather than hidden fallbacks, preserving PalladiumAI's live-data/no-simulation rule.

License rule: upstream ideas, interfaces and documented behavior may guide native implementation, but copyleft source must not be copied into PalladiumAI unless the repository's licensing strategy explicitly permits it.
