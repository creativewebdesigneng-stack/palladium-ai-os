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
from .providers import (
    ChatResult,
    LocalOpenAICompatibleProvider,
    ProviderConfigurationError,
    ProviderRequestError,
    validate_loopback_base_url,
)

__all__ = [
    "ActionKind",
    "AgentPlan",
    "AgentPolicy",
    "ChatResult",
    "LocalOpenAICompatibleProvider",
    "ProviderConfigurationError",
    "ProviderDescriptor",
    "PlanStep",
    "PlanValidation",
    "ProviderRequestError",
    "SideEffect",
    "RouteDecision",
    "RoutingPolicy",
    "TaskKind",
    "ToolDefinition",
    "choose_provider",
    "validate_loopback_base_url",
    "validate_plan",
]
