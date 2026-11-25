"""Strict Recomp Lab job/result contracts; no binary execution is performed here."""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum


_SHA256 = re.compile(r"^[a-fA-F0-9]{64}$")


class RecompOperation(StrEnum):
    INSPECT = "inspect"
    DISASSEMBLE = "disassemble"
    TRANSLATE_SUBSET = "translate_subset"
    VALIDATE_SHADER = "validate_shader"
    COMPARE_OUTPUT = "compare_output"


class ApprovalState(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class JobStatus(StrEnum):
    COMPLETED = "completed"
    FAILED = "failed"
    UNSUPPORTED = "unsupported"


class ReviewState(StrEnum):
    UNREVIEWED = "unreviewed"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass(frozen=True, slots=True)
class ArtifactReference:
    reference: str
    sha256: str
    media_type: str

    def __post_init__(self) -> None:
        if not self.reference.strip() or not self.media_type.strip():
            raise ValueError("Artifact reference and media type are required.")
        if not _SHA256.fullmatch(self.sha256):
            raise ValueError("Artifact hash must be a SHA-256 hex digest.")


@dataclass(frozen=True, slots=True)
class ResourceLimits:
    cpu_seconds: int = 30
    memory_mb: int = 512
    wall_seconds: int = 60
    max_output_bytes: int = 2_000_000

    def __post_init__(self) -> None:
        bounds = {
            "cpu_seconds": (1, 3600),
            "memory_mb": (64, 32768),
            "wall_seconds": (1, 3600),
            "max_output_bytes": (1, 50_000_000),
        }
        for field, (minimum, maximum) in bounds.items():
            value = getattr(self, field)
            if not isinstance(value, int) or isinstance(value, bool) or not minimum <= value <= maximum:
                raise ValueError(f"{field} must be an integer between {minimum} and {maximum}.")


@dataclass(frozen=True, slots=True)
class RecompLabJob:
    job_id: str
    parent_task_id: str
    trace_id: str
    operation: RecompOperation
    input_artifact: ArtifactReference
    provenance: str
    authorisation_record: str
    target_architecture: str
    allowed_capabilities: frozenset[str]
    limits: ResourceLimits
    expected_outputs: tuple[str, ...]
    acceptance_criteria: tuple[str, ...]
    approval: ApprovalState = ApprovalState.PENDING

    def __post_init__(self) -> None:
        for field in ("job_id", "parent_task_id", "trace_id", "provenance", "authorisation_record", "target_architecture"):
            if not getattr(self, field).strip():
                raise ValueError(f"{field} is required.")
        if not isinstance(self.operation, RecompOperation):
            raise ValueError("Unsupported Recomp Lab operation.")
        if not isinstance(self.approval, ApprovalState):
            raise ValueError("Invalid approval state.")
        if not self.allowed_capabilities or not all(isinstance(item, str) and item.strip() for item in self.allowed_capabilities):
            raise ValueError("At least one explicit allowed capability is required.")
        if not self.expected_outputs or not all(item.strip() for item in self.expected_outputs):
            raise ValueError("Expected outputs must be explicitly declared.")
        if not self.acceptance_criteria or not all(item.strip() for item in self.acceptance_criteria):
            raise ValueError("Acceptance criteria must be explicitly declared.")


@dataclass(frozen=True, slots=True)
class RecompLabResult:
    job_id: str
    trace_id: str
    tool_id: str
    tool_version: str
    input_sha256: str
    status: JobStatus
    output_artifacts: tuple[ArtifactReference, ...] = ()
    diagnostics: tuple[str, ...] = ()
    warnings: tuple[str, ...] = ()
    unsupported_features: tuple[str, ...] = ()
    test_evidence: tuple[str, ...] = ()
    reproducible_config_ref: str | None = None
    review: ReviewState = ReviewState.UNREVIEWED
    failure_reason: str | None = None

    def __post_init__(self) -> None:
        for field in ("job_id", "trace_id", "tool_id", "tool_version"):
            if not getattr(self, field).strip():
                raise ValueError(f"{field} is required.")
        if not _SHA256.fullmatch(self.input_sha256):
            raise ValueError("Result input hash must be a SHA-256 hex digest.")
        if not isinstance(self.status, JobStatus) or not isinstance(self.review, ReviewState):
            raise ValueError("Invalid result status or review state.")
        if self.status == JobStatus.FAILED and not (self.failure_reason or "").strip():
            raise ValueError("Failed results require a failure reason.")


def validate_job_for_execution(job: RecompLabJob) -> tuple[str, ...]:
    """Return policy errors; a pending or rejected job is never executable."""
    errors: list[str] = []
    if job.approval != ApprovalState.APPROVED:
        errors.append("Recomp Lab job has not received explicit approval.")
    if job.operation in {RecompOperation.DISASSEMBLE, RecompOperation.TRANSLATE_SUBSET} and "binary_analysis" not in job.allowed_capabilities:
        errors.append("Binary analysis capability is not explicitly authorised.")
    if job.operation == RecompOperation.VALIDATE_SHADER and "shader_validation" not in job.allowed_capabilities:
        errors.append("Shader validation capability is not explicitly authorised.")
    if job.operation == RecompOperation.COMPARE_OUTPUT and "output_comparison" not in job.allowed_capabilities:
        errors.append("Output comparison capability is not explicitly authorised.")
    return tuple(errors)


def validate_result_for_job(job: RecompLabJob, result: RecompLabResult) -> tuple[str, ...]:
    """Check result provenance and linkage; this does not certify correctness."""
    errors: list[str] = []
    if result.job_id != job.job_id or result.trace_id != job.trace_id:
        errors.append("Result does not belong to the requested job and trace.")
    if result.input_sha256.casefold() != job.input_artifact.sha256.casefold():
        errors.append("Result input hash does not match the authorised input artifact.")
    if result.status == JobStatus.COMPLETED and not result.output_artifacts and not result.diagnostics:
        errors.append("Completed result must include an artifact or structured diagnostics.")
    if result.status == JobStatus.COMPLETED and not result.test_evidence:
        errors.append("Completed result must include verification evidence.")
    return tuple(errors)
