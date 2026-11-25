import json
from pathlib import Path
from dataclasses import dataclass

import pytest

from astra_x.evaluation import (
    BenchmarkCase,
    evaluate_cases,
    load_cases,
    summarise_results,
    write_report,
)


@dataclass
class FakeResponse:
    content: str


class FakeProvider:
    def __init__(self, answers):
        self.answers = iter(answers)

    def chat(self, messages, **kwargs):
        return FakeResponse(next(self.answers))


def test_load_cases_and_reject_duplicate_ids(tmp_path):
    dataset = tmp_path / "cases.jsonl"
    dataset.write_text(
        '{"id":"a","category":"reasoning","prompt":"test","required_terms":["yes"]}\n'
        '{"id":"a","category":"reasoning","prompt":"again"}\n',
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="duplicate"):
        load_cases(dataset)


def test_evaluation_scores_required_terms_case_insensitively():
    cases = [
        BenchmarkCase("a", "reasoning", "say OK", ("ok",)),
        BenchmarkCase("b", "coding", "say pass", ("pass", "pytest")),
    ]
    results = evaluate_cases(FakeProvider(["OK", "pass"]), cases)
    assert results[0].passed is True
    assert results[1].passed is False
    assert results[1].missing_terms == ("pytest",)
    summary = summarise_results(results)
    assert summary["cases"] == 2
    assert summary["passed"] == 1
    assert summary["pass_rate"] == 0.5


def test_provider_error_is_recorded_without_stopping_run():
    class BrokenProvider:
        def chat(self, *args, **kwargs):
            raise RuntimeError("do not persist this message")

    results = evaluate_cases(
        BrokenProvider(),
        [BenchmarkCase("a", "reasoning", "test", ())],
    )
    assert results[0].passed is False
    assert results[0].error == "RuntimeError"
    assert "do not persist" not in str(results[0])


def test_report_contains_metadata_summary_and_case_results(tmp_path):
    case = BenchmarkCase("a", "reasoning", "say yes", ("yes",))
    results = evaluate_cases(FakeProvider(["yes"]), [case])
    destination = tmp_path / "nested" / "report.json"
    write_report(results, destination, metadata={"model": "test-model"})
    report = json.loads(destination.read_text(encoding="utf-8"))
    assert report["schema_version"] == "1.0"
    assert report["summary"]["passed"] == 1
    assert report["results"][0]["case_id"] == "a"



@pytest.mark.parametrize(
    "line",
    [
        '["not", "an", "object"]',
        '{"id":"a","category":"reasoning","prompt":"x","required_terms":"chars"}',
        '{"id":"a","category":"reasoning","prompt":"x","max_tokens":true}',
        '{"id":1,"category":"reasoning","prompt":"x"}',
    ],
)
def test_load_cases_rejects_invalid_schema(tmp_path, line):
    dataset = tmp_path / "invalid.jsonl"
    dataset.write_text(line + "\\n", encoding="utf-8")
    with pytest.raises(ValueError, match="line 1"):
        load_cases(dataset)



def test_bundled_baseline_dataset_is_loadable():
    dataset = Path(__file__).parents[1] / "benchmarks" / "baseline-v0.1.jsonl"
    cases = load_cases(dataset)
    assert len(cases) == 6
    assert {case.category for case in cases} >= {
        "reasoning",
        "coding",
        "research",
        "instruction_following",
    }
