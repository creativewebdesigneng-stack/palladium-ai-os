"""Reproducible model experiment and artifact manifest contracts."""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum


_SHA256 = re.compile(r"^[a-fA-F0-9]{64}$")
_GIT_SHA = re.compile(r"^[a-fA-F0-9]{40}$")


class ModelOwnership(StrEnum):
    BLACKSTAR = "blackstar"
    THIRD_PARTY = "third_party"


class ExperimentMethod(StrEnum):
    LORA = "lora"
    QLORA = "qlora"
    FULL_FINE_TUNE = "full_fine_tune"
    FROM_SCRATCH = "from_scratch"


class ComputeLocation(StrEnum):
    LOCAL = "local"
    CLOUD = "cloud"


class ExperimentStatus(StrEnum):
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class ModelArtifactManifest:
    model_id: str
    ownership: ModelOwnership
    architecture: str
    parameter_count: int
    weights_reference: str
    weights_sha256: str
    license_id: str
    training_code_commit: str
    evaluation_suite_version: str
    evaluation_report_reference: str
    training_data_sha256: tuple[str, ...]
    base_model_id: str | None = None
    quantization: str | None = None
    intended_uses: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        required = (
            self.model_id,
            self.architecture,
            self.weights_reference,
            self.license_id,
            self.evaluation_suite_version,
            self.evaluation_report_reference,
        )
        if not all(isinstance(value, str) and value.strip() for value in required):
            raise ValueError("Model manifest is missing required identity, licence or evaluation metadata.")
        if not isinstance(self.ownership, ModelOwnership):
            raise ValueError("Model ownership must be declared.")
        if not isinstance(self.parameter_count, int) or isinstance(self.parameter_count, bool) or self.parameter_count < 1:
            raise ValueError("Parameter count must be a positive integer.")
        if not _SHA256.fullmatch(self.weights_sha256):
            raise ValueError("Weights checksum must be a SHA-256 hex digest.")
        if not _GIT_SHA.fullmatch(self.training_code_commit):
            raise ValueError("Training code revision must be a full 40-character Git commit SHA.")
        if not self.training_data_sha256 or not all(_SHA256.fullmatch(value) for value in self.training_data_sha256):
            raise ValueError("Every training data source must be represented by a SHA-256 digest.")
        if self.ownership == ModelOwnership.THIRD_PARTY and not (self.base_model_id or "").strip():
            raise ValueError("Third-party model manifests must identify their base model.")
        if self.ownership == ModelOwnership.BLACKSTAR and self.base_model_id and not self.base_model_id.strip():
            raise ValueError("Base model ID cannot be blank.")


@dataclass(frozen=True, slots=True)
class ModelExperiment:
    experiment_id: str
    method: ExperimentMethod
    compute_location: ComputeLocation
    hardware_profile: str
    dataset_sha256: str
    config_sha256: str
    code_commit: str
    created_at: str
    status: ExperimentStatus
    output_model_id: str | None = None
    metrics_report_reference: str | None = None

    def __post_init__(self) -> None:
        for field in ("experiment_id", "hardware_profile", "created_at"):
            if not getattr(self, field).strip():
                raise ValueError(f"{field} is required.")
        if not isinstance(self.method, ExperimentMethod):
            raise ValueError("Experiment method must be declared.")
        if not isinstance(self.compute_location, ComputeLocation):
            raise ValueError("Experiment compute location must be declared.")
        if not isinstance(self.status, ExperimentStatus):
            raise ValueError("Experiment status must be declared.")
        for field in ("dataset_sha256", "config_sha256"):
            if not _SHA256.fullmatch(getattr(self, field)):
                raise ValueError(f"{field} must be a SHA-256 hex digest.")
        if not _GIT_SHA.fullmatch(self.code_commit):
            raise ValueError("Experiment code revision must be a full Git commit SHA.")
        if self.status == ExperimentStatus.COMPLETED and not (self.metrics_report_reference or "").strip():
            raise ValueError("Completed experiments require a metrics report reference.")


def validate_experiment_for_policy(
    experiment: ModelExperiment,
    *,
    allow_cloud_compute: bool = False,
) -> tuple[str, ...]:
    """Enforce the programme's local-first, no-new-spend default."""
    errors: list[str] = []
    if experiment.compute_location == ComputeLocation.CLOUD and not allow_cloud_compute:
        errors.append("Cloud compute is disabled by the local-first Astra X policy.")
    return tuple(errors)
