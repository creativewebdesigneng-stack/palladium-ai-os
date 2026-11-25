"""Blackstar Astra X research prototype.

This package contains provider-neutral orchestration and local-provider
primitives. It does not ship a foundation model or execute generated code.
"""

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
    "ChatResult",
    "LocalOpenAICompatibleProvider",
    "ProviderConfigurationError",
    "ProviderDescriptor",
    "ProviderRequestError",
    "RouteDecision",
    "RoutingPolicy",
    "TaskKind",
    "choose_provider",
    "validate_loopback_base_url",
]
