import pytest

from astra_x.recomp_lab import (
    ApprovalState,
    ArtifactReference,
    JobStatus,
    RecompLabJob,
    RecompLabResult,
    RecompOperation,
    ResourceLimits,
    ReviewState,
    validate_job_for_execution,
    validate_result_for_job,
)


HASH = "a" * 64
OUTPUT_HASH = "b" * 64


def make_job(**overrides):
    values = {
        "job_id": "job-1",
        "parent_task_id": "task-1",
        "trace_id": "trace-1",
        "operation": RecompOperation.INSPECT,
        "input_artifact": ArtifactReference("artifact://sample-1", HASH, "application/octet-stream"),
        "provenance": "synthetic test fixture",
        "authorisation_record": "owner-approved-fixture",
        "target_architecture": "x86_64",
        "allowed_capabilities": frozenset({"metadata_inspection"}),
        "limits": ResourceLimits(),
        "expected_outputs": ("inspection-report",),
        "acceptance_criteria": ("report contains input hash",),
        "approval": ApprovalState.APPROVED,
    }
    values.update(overrides)
    return RecompLabJob(**values)


def test_pending_jobs_are_not_executable():
    job = make_job(approval=ApprovalState.PENDING)
    assert "Recomp Lab job has not received explicit approval." in validate_job_for_execution(job)


def test_binary_operations_require_explicit_binary_analysis_capability():
    job = make_job(
        operation=RecompOperation.DISASSEMBLE,
        allowed_capabilities=frozenset({"metadata_inspection"}),
    )
    assert "Operation requires explicit binary_analysis capability." in validate_job_for_execution(job)


def test_shader_validation_requires_its_own_capability():
    job = make_job(
        operation=RecompOperation.VALIDATE_SHADER,
        allowed_capabilities=frozenset({"metadata_inspection"}),
    )
    assert "Operation requires explicit shader_validation capability." in validate_job_for_execution(job)


def test_resource_limits_are_bounded():
    with pytest.raises(ValueError, match="memory_mb"):
        ResourceLimits(memory_mb=100_000)
    with pytest.raises(ValueError, match="wall_seconds"):
        ResourceLimits(wall_seconds=0)


def test_artifact_hash_must_be_sha256():
    with pytest.raises(ValueError, match="SHA-256"):
        ArtifactReference("artifact://bad", "not-a-hash", "application/octet-stream")


def test_completed_result_requires_test_evidence():
    job = make_job()
    result = RecompLabResult(
        job_id=job.job_id,
        trace_id=job.trace_id,
        tool_id="recomp.inspect",
        tool_version="0.1.0",
        input_sha256=HASH,
        status=JobStatus.COMPLETED,
        output_artifacts=(ArtifactReference("artifact://report", OUTPUT_HASH, "application/json"),),
    )
    assert "Completed result must include verification evidence." in validate_result_for_job(job, result)


def test_result_must_match_authorised_job_trace_and_input_hash():
    job = make_job()
    result = RecompLabResult(
        job_id="other-job",
        trace_id="other-trace",
        tool_id="recomp.inspect",
        tool_version="0.1.0",
        input_sha256=OUTPUT_HASH,
        status=JobStatus.COMPLETED,
        diagnostics=("sample inspected",),
        test_evidence=("hash-checked",),
        review=ReviewState.UNREVIEWED,
    )
    errors = validate_result_for_job(job, result)
    assert "Result does not belong to the requested job and trace." in errors
    assert "Result input hash does not match the authorised input artifact." in errors


def test_failed_result_requires_reason():
    with pytest.raises(ValueError, match="failure reason"):
        RecompLabResult(
            job_id="job-1",
            trace_id="trace-1",
            tool_id="recomp.inspect",
            tool_version="0.1.0",
            input_sha256=HASH,
            status=JobStatus.FAILED,
        )


def test_valid_completed_result_links_to_authorised_input():
    job = make_job()
    result = RecompLabResult(
        job_id=job.job_id,
        trace_id=job.trace_id,
        tool_id="recomp.inspect",
        tool_version="0.1.0",
        input_sha256=HASH,
        status=JobStatus.COMPLETED,
        output_artifacts=(ArtifactReference("artifact://report", OUTPUT_HASH, "application/json"),),
        test_evidence=("report schema passed", "input hash matched"),
    )
    assert validate_result_for_job(job, result) == ()



def test_inspection_operation_requires_metadata_capability():
    job = make_job(allowed_capabilities=frozenset({"output_comparison"}))
    assert "Operation requires explicit metadata_inspection capability." in validate_job_for_execution(job)
