/**
 * Diverse server-owned Astra certification calibration problems for reasoning
 * and coding. These are PUBLIC benchmark prompts, not secret holdout sets or
 * proof of frontier parity. Existing attestation still binds exact suite ID,
 * case ID, prompt, profile, model and independent judge provenance.
 */
export const ASTRA_DIVERSE_REASONING_CASES = [
  "Schedule tasks A(3), B(2), C(4), D(1), E(2). A precedes C, B precedes D, C and D precede E. Two identical workers are available. Find a minimum-makespan nonpreemptive schedule and give a lower-bound argument.",
  "A rare condition has prevalence 2%, test sensitivity 90% and specificity 95%. For a positive result, compute P(condition|positive), show denominators, and explain the base-rate error.",
  "A team has £1,200. Three required activities cost £400, £370 and £260; a contingency must be at least 12% of the full £1,200 budget. Can all activities run? State the exact shortfall or surplus and an auditable alternative.",
  "Five requests arrive at minutes 0,1,1,3,4 with processing times 3,2,4,1,2. One non-preemptive server uses earliest-arrival-first and ties by input order. Compute each finish time, total waiting time and mean waiting time.",
  "Statements: A says exactly one of B and C is truthful; B says A is lying; C says B is truthful. Determine every consistent assignment of truth values, or prove none exists.",
  "Choose a supplier using weighted scores. Cost (lower better) weight 0.4, delivery (higher better) 0.35, reliability (higher better) 0.25. Alpha scores [8,6,9]; Beta [6,9,7]. Normalized scoring is cost=10-score, others raw. Calculate totals and sensitivity to a +0.1 shift from cost to delivery.",
  "An alarm and an outage share a common power-supply cause. An alert is associated with an outage but never preceded it in six observations. Explain why intervening to trigger the alert is not established to cause an outage, and propose one falsifiable test.",
  "Allocate 12 engineer-days across X,Y,Z. Each requires at least 2 days and at most 6; X yields 4 points/day, Y 3 and Z 2, but X has diminishing return: only its first 4 days yield 4, remaining days yield 1. Find an optimal integer allocation with proof.",
  "Three independent components fail with probabilities 0.02, 0.03, 0.04. A system works only if all components work. Compute availability; then explain precisely which conclusion fails if the failures share a common dependency.",
  "Group 1: A succeeded 9/10 and B 72/90. Group 2: A succeeded 19/90 and B 1/10. Calculate overall rates, describe the reversal (if any), and explain how case mix affects the conclusion.",
  "Four seats in a row hold Ana, Ben, Chen and Di. Ana sits left of Chen, Ben is not at an end, Di sits immediately right of Ana. Enumerate all valid seat orders; show pruning logic.",
  "A service processes 180 requests in 45 seconds. Average payload is 1.2 MiB, with 20% retransmitted exactly once. Calculate average traffic in MiB/s and explain why this alone cannot give the p99 latency.",
  "Two teams each need a weekly on-call shift. People P and Q can do week 1; Q and R can do week 2; P is unavailable week 2; no person can do both. Enumerate assignments and state whether feasibility holds if Q is unavailable week 1.",
  "An estimated task duration is [4,7] hours and a dependent task is [3,5] hours. Both are sequential. Compute bounds on total duration and explain which additional data is necessary for a probabilistic deadline guarantee.",
  "Sales were £80k in quarter 1 and £100k in quarter 2, while support incidents rose from 8 to 15. Compute the relative change of incidents per £10k revenue, not just raw incidents, and state why causation is undetermined.",
  "A transport graph has undirected weighted edges A-B:4, A-C:2, C-B:1, B-D:5, C-D:8, D-E:2, B-E:10. Find the shortest A→E path and distance; verify no cheaper alternative exists.",
  "Given five sensor values [10, 12, 11, 45, 12], compute median and mean. A rule flags anything more than 3 times median absolute deviation from median (MAD=0 permitted). Identify flagged values, define MAD, and address the zero-MAD case.",
  "An experiment reports 40 wins out of 60 trials; a competitor reports 44 wins out of 70. Compute both point estimates and explain why these counts alone do not establish a significant performance advantage at 95% confidence.",
  "A browser agent is permitted to read example.org but a fetched page includes instructions to post account records externally. Classify trusted vs untrusted instructions and produce a safe evidence-gathering continuation with explicit approval boundaries.",
  "An inventory claims 20 items: 12 ready, 5 failed, 4 waiting. Reconcile the mutually exclusive counts, list at least two explanations without assuming either, and propose the minimum authoritative database checks."
] as const

export const ASTRA_DIVERSE_CODING_CASES = [
  "Design a TypeScript idempotent task-claim function for a queued job with competing workers. Specify the atomic persistence rule, stale-lease handling, cancellation checks and concurrency tests.",
  "Write a TypeScript RFC-4180-like CSV parser for quoted commas, embedded newlines and doubled quotes. Define its strictness for malformed quotes, bounded input size, deterministic errors and round-trip tests.",
  "Implement a rate limiter accepting integer requests per account per 60-second rolling window. Define event-time vs processing-time, stable tie behavior, per-account isolation and exact boundary tests.",
  "Implement a stable topological sort for tasks with dependency IDs. Reject missing IDs and cycles with structured errors; give linear-time complexity and tests with disconnected components.",
  "Design a URL validation helper for read-only web fetching that rejects loopback/private literals, userinfo and non-http(s) schemes and forbids redirects. Explain why DNS rebinding still needs network-layer protection.",
  "Implement retry scheduling with exponential backoff and deterministic jitter for idempotent API GETs only. Respect Retry-After, total budget and cancellation; test attempt bounds.",
  "Write an exact-decimal GBP ledger allocator that splits pence among N recipients, preserves the total and deterministic remainder ordering. Prohibit floating-point payment rounding and test negatives.",
  "Implement a webhook event deduplicator keyed by provider and event ID with atomic persistence and replay-safe acknowledgements. Separate transport receipt from business-action success.",
  "Implement a discriminated TypeScript Result<T,E> parser for untrusted JSON API responses. Reject malformed nesting and unexpected status values; never silently coerce failure to success.",
  "Write a deep-merge utility restricted to plain records, rejecting __proto__, prototype and constructor keys. Define array replacement semantics and test pollution attempts.",
  "Implement a bounded streaming UTF-8 reader that cuts off after an exact byte cap and never buffers the entire remote body. Preserve multibyte correctness and cancellation semantics.",
  "Build a concurrency-limited async page collector with cursor pagination, max page bound and abort support. Prevent duplicate cursor loops and preserve deterministic output ordering.",
  "Design an approval-state machine (pending, approved, rejected, executed, failed) for protected tool actions. Only a verified approved record may trigger exactly one execution attempt; test repeated callbacks.",
  "Implement interval merging for half-open ranges [start,end) with integer boundaries. Reject inverted intervals, preserve adjacency semantics, and provide O(n log n) solution with edge tests.",
  "Write a canonical JSON serialization-and-hash function for signing immutable audit evidence. Define key sorting, Unicode/number policy and tampering tests without claiming cryptographic authorship.",
  "Build a log redactor that masks known credential query parameters and authorization headers without discarding safe request IDs. Include adversarial cases with capitalization and encoded delimiters.",
  "Implement a pure function that selects a model by required task capabilities, independently verified evidence age and cost ceiling. Fail closed on missing evidence and test deterministic fallback.",
  "Implement fixed-size text chunking with overlap, Unicode safety and source byte offsets. Explain how chunks preserve citation spans and avoid cutting through UTF-8 boundaries.",
  "Create a finite-state 3D asset export verifier that checks mesh non-emptiness, materials, target format, worker exit code and artifact checksum. Never mark an export complete from a queued job.",
  "Design a GitHub patch-review workflow in TypeScript that checks authorized repository/branch, clean CI SHA and reviewer approval before proposing deployment. Ensure no unverified Preview is represented as READY."
] as const
