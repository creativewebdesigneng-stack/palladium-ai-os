"""Blackstar Astra X research prototype.

This package contains provider-neutral orchestration and local-provider
primitives. It does not ship a foundation model or execute generated code.
"""

from .agent import (
    ActionKind,
    AgentPlan,
    AgentPolicy,
    PlanStep,
    PlanValidation,
    TaskEnvelope,
    SideEffect,
    ToolDefinition,
    validate_plan,
)
from .core import (
    ProviderDescriptor,
    RouteDecision,
    RoutingPolicy,
    TaskKind,
    choose_provider,
)
from .recomp_lab import (
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
from .providers import (
    ChatResult,
    LocalOpenAICompatibleProvider,
    ProviderConfigurationError,
    ProviderRequestError,
    validate_loopback_base_url,
)

__all__ = [
    "ActionKind",
    "ApprovalState",
    "ArtifactReference",
    "AgentPlan",
    "AgentPolicy",
    "ChatResult",
    "ComputeLocation",
    "JobStatus",
    "ExperimentMethod",
    "ExperimentStatus",
    "LocalOpenAICompatibleProvider",
    "ProviderConfigurationError",
    "ProviderDescriptor",
    "PlanStep",
    "PlanValidation",
    "ProviderRequestError",
    "RecompLabJob",
    "RecompLabResult",
    "RecompOperation",
    "ResourceLimits",
    "ReviewState",
    "SideEffect",
    "RouteDecision",
    "RoutingPolicy",
    "TaskEnvelope",
    "TaskKind",
    "ToolDefinition",
    "choose_provider",
    "validate_experiment_for_policy",
    "validate_job_for_execution",
    "validate_loopback_base_url",
    "validate_plan",
    "validate_result_for_job",
]
