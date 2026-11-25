"""Run the versioned Astra X benchmark against the configured local proxy."""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from astra_x.evaluation import evaluate_cases, load_cases, summarise_results, write_report
from astra_x.providers import LocalOpenAICompatibleProvider, ProviderConfigurationError


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", default="research/astra-x/benchmarks/baseline-v0.1.jsonl")
    parser.add_argument("--output", default="research/astra-x/results/latest.json")
    parser.add_argument("--model", default=os.environ.get("BLACKSTAR_NATIVE_MODEL", ""))
    parser.add_argument("--base-url", default=os.environ.get("OPENAI_COMPATIBLE_BASE_URL", ""))
    args = parser.parse_args()

    if Path(args.dataset).resolve() == Path(args.output).resolve():
        print("Output path must not overwrite the benchmark dataset.", file=sys.stderr)
        return 2

    token = (
        os.environ.get("BLACKSTAR_LOCAL_PROXY_BEARER_TOKEN")
        or os.environ.get("BLACKSTAR_BRIDGE_TOKEN")
        or os.environ.get("OPENAI_COMPATIBLE_API_KEY")
        or ""
    )
    if not args.base_url or not args.model or not token:
        print(
            "Missing local provider configuration. Set OPENAI_COMPATIBLE_BASE_URL, "
            "BLACKSTAR_NATIVE_MODEL and a local proxy token (BLACKSTAR_LOCAL_PROXY_BEARER_TOKEN, "
            "BLACKSTAR_BRIDGE_TOKEN or OPENAI_COMPATIBLE_API_KEY) in this "
            "local shell; never pass or commit the token as a command-line argument.",
            file=sys.stderr,
        )
        return 2

    try:
        cases = load_cases(args.dataset)
        provider = LocalOpenAICompatibleProvider(
            base_url=args.base_url,
            model=args.model,
            bearer_token=token,
        )
    except (OSError, ValueError, ProviderConfigurationError) as exc:
        print(f"Configuration or dataset error: {type(exc).__name__}", file=sys.stderr)
        return 2

    results = evaluate_cases(provider, cases)
    metadata = {
        "model": args.model,
        "dataset": Path(args.dataset).name,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "provider": "local-openai-compatible-proxy",
    }
    write_report(results, args.output, metadata=metadata)
    summary = summarise_results(results)
    print(f"Benchmark complete: {summary['passed']}/{summary['cases']} passed.")
    print(f"Mean latency: {summary['mean_latency_ms']} ms")
    print(f"Report: {args.output}")
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
