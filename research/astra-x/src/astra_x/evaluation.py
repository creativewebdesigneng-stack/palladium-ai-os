"""Small, deterministic benchmark runner for local Astra X models.

The evaluator deliberately uses transparent checks, not a model-as-judge. It
records latency and output length, and never executes model-generated code.
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable, Iterable, Mapping, Protocol, Sequence


class ChatProvider(Protocol):
    def chat(self, messages: Sequence[Mapping[str, str]], **kwargs: object) -> object: ...


@dataclass(frozen=True, slots=True)
class BenchmarkCase:
    case_id: str
    category: str
    prompt: str
    required_terms: tuple[str, ...]
    max_tokens: int = 512


@dataclass(frozen=True, slots=True)
class CaseResult:
    case_id: str
    category: str
    passed: bool
    latency_ms: float
    output_characters: int
    missing_terms: tuple[str, ...]
    error: str | None = None


def load_cases(path: str | Path) -> list[BenchmarkCase]:
    """Load JSONL benchmark cases and reject malformed or duplicate IDs."""
    cases: list[BenchmarkCase] = []
    seen: set[str] = set()
    with Path(path).open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            try:
                item = json.loads(line)
                case = BenchmarkCase(
                    case_id=str(item["id"]),
                    category=str(item["category"]),
                    prompt=str(item["prompt"]),
                    required_terms=tuple(str(term) for term in item.get("required_terms", [])),
                    max_tokens=int(item.get("max_tokens", 512)),
                )
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
                raise ValueError(f"Invalid benchmark case on line {line_number}.") from exc
            if not case.case_id.strip() or case.case_id in seen:
                raise ValueError(f"Empty or duplicate benchmark id on line {line_number}.")
            if not case.category.strip() or not case.prompt.strip():
                raise ValueError(f"Missing category or prompt on line {line_number}.")
            if not 1 <= case.max_tokens <= 8192:
                raise ValueError(f"Invalid max_tokens on line {line_number}.")
            seen.add(case.case_id)
            cases.append(case)
    if not cases:
        raise ValueError("Benchmark dataset contains no cases.")
    return cases


def evaluate_cases(
    provider: ChatProvider,
    cases: Iterable[BenchmarkCase],
    *,
    clock: Callable[[], float] = time.perf_counter,
) -> list[CaseResult]:
    """Run each case once and apply case-insensitive required-term checks."""
    results: list[CaseResult] = []
    for case in cases:
        started = clock()
        try:
            response = provider.chat(
                [{"role": "user", "content": case.prompt}],
                max_tokens=case.max_tokens,
                temperature=0.0,
            )
            content = getattr(response, "content", None)
            if not isinstance(content, str):
                raise TypeError("Provider response content was not a string.")
            lowered = content.casefold()
            missing = tuple(term for term in case.required_terms if term.casefold() not in lowered)
            results.append(CaseResult(
                case_id=case.case_id,
                category=case.category,
                passed=not missing,
                latency_ms=round(max(0.0, (clock() - started) * 1000), 2),
                output_characters=len(content),
                missing_terms=missing,
            ))
        except Exception as exc:  # Keep the run going; store only a safe error class.
            results.append(CaseResult(
                case_id=case.case_id,
                category=case.category,
                passed=False,
                latency_ms=round(max(0.0, (clock() - started) * 1000), 2),
                output_characters=0,
                missing_terms=(),
                error=type(exc).__name__,
            ))
    return results


def summarise_results(results: Sequence[CaseResult]) -> dict[str, object]:
    total = len(results)
    passed = sum(result.passed for result in results)
    categories: dict[str, dict[str, int]] = {}
    for result in results:
        bucket = categories.setdefault(result.category, {"passed": 0, "total": 0})
        bucket["total"] += 1
        bucket["passed"] += int(result.passed)
    return {
        "cases": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / total, 4) if total else 0.0,
        "mean_latency_ms": round(sum(r.latency_ms for r in results) / total, 2) if total else 0.0,
        "categories": categories,
    }


def write_report(results: Sequence[CaseResult], output_path: str | Path, *, metadata: Mapping[str, str]) -> None:
    """Write a portable JSON report; callers must not include credentials in metadata."""
    report = {
        "schema_version": "1.0",
        "metadata": dict(metadata),
        "summary": summarise_results(results),
        "results": [asdict(result) for result in results],
    }
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
