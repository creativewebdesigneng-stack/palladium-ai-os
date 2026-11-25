import pytest

from astra_x.experiments import (
    ComputeLocation,
    ExperimentMethod,
    ExperimentStatus,
    ModelArtifactManifest,
    ModelExperiment,
    ModelOwnership,
    validate_experiment_for_policy,
)


HASH = "a" * 64
COMMIT = "b" * 40


def make_experiment(**overrides):
    values = {
        "experiment_id": "exp-001",
        "method": ExperimentMethod.QLORA,
        "compute_location": ComputeLocation.LOCAL,
        "hardware_profile": "GTX 1080 Ti 11GB",
        "dataset_sha256": HASH,
        "config_sha256": "c" * 64,
        "code_commit": COMMIT,
        "created_at": "2026-11-25T00:00:00Z",
        "status": ExperimentStatus.PLANNED,
    }
    values.update(overrides)
    return ModelExperiment(**values)


def test_local_experiment_passes_zero_cloud_policy():
    assert validate_experiment_for_policy(make_experiment()) == ()


def test_cloud_compute_requires_explicit_policy_override():
    experiment = make_experiment(compute_location=ComputeLocation.CLOUD)
    assert validate_experiment_for_policy(experiment) == (
        "Cloud compute is disabled by the local-first Astra X policy.",
    )
    assert validate_experiment_for_policy(experiment, allow_cloud_compute=True) == ()


def test_completed_experiment_requires_metrics_report():
    with pytest.raises(ValueError, match="metrics report"):
        make_experiment(status=ExperimentStatus.COMPLETED)


def test_experiment_requires_hashes_and_full_code_revision():
    with pytest.raises(ValueError, match="SHA-256"):
        make_experiment(dataset_sha256="bad")
    with pytest.raises(ValueError, match="Git commit"):
        make_experiment(code_commit="short")


def test_model_manifest_records_license_weight_hash_and_data_provenance():
    manifest = ModelArtifactManifest(
        model_id="astra-x-adapted-001",
        ownership=ModelOwnership.BLACKSTAR,
        architecture="Qwen3",
        parameter_count=8_000_000_000,
        weights_reference="local-artifact://astra-x/model",
        weights_sha256=HASH,
        license_id="upstream-model-license-reference",
        training_code_commit=COMMIT,
        evaluation_suite_version="baseline-v0.1",
        evaluation_report_reference="artifact://eval-report-001",
        training_data_sha256=("d" * 64,),
        base_model_id="qwen3:8b-q4_K_M",
        quantization="Q4_K_M",
        intended_uses=("local inference",),
    )
    assert manifest.ownership == ModelOwnership.BLACKSTAR
    assert manifest.base_model_id == "qwen3:8b-q4_K_M"


def test_third_party_manifest_requires_base_model_identity():
    with pytest.raises(ValueError, match="base model"):
        ModelArtifactManifest(
            model_id="external-001",
            ownership=ModelOwnership.THIRD_PARTY,
            architecture="transformer",
            parameter_count=1_000_000,
            weights_reference="artifact://external",
            weights_sha256=HASH,
            license_id="Apache-2.0",
            training_code_commit=COMMIT,
            evaluation_suite_version="v1",
            evaluation_report_reference="artifact://eval",
            training_data_sha256=("d" * 64,),
        )


def test_manifest_rejects_missing_license_or_training_data_hashes():
    with pytest.raises(ValueError, match="licence"):
        ModelArtifactManifest(
            model_id="astra-x",
            ownership=ModelOwnership.BLACKSTAR,
            architecture="transformer",
            parameter_count=1,
            weights_reference="artifact://weights",
            weights_sha256=HASH,
            license_id="",
            training_code_commit=COMMIT,
            evaluation_suite_version="v1",
            evaluation_report_reference="artifact://eval",
            training_data_sha256=("d" * 64,),
        )
    with pytest.raises(ValueError, match="training data"):
        ModelArtifactManifest(
            model_id="astra-x",
            ownership=ModelOwnership.BLACKSTAR,
            architecture="transformer",
            parameter_count=1,
            weights_reference="artifact://weights",
            weights_sha256=HASH,
            license_id="MIT",
            training_code_commit=COMMIT,
            evaluation_suite_version="v1",
            evaluation_report_reference="artifact://eval",
            training_data_sha256=(),
        )
