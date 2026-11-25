"""Blackstar Astra X research prototype.

This package contains provider-neutral orchestration primitives. It does not
ship a foundation model or execute remote inference.
"""

from .core import (
    ProviderDescriptor,
    RouteDecision,
    RoutingPolicy,
    TaskKind,
    choose_provider,
)

__all__ = [
    "ProviderDescriptor",
    "RouteDecision",
    "RoutingPolicy",
    "TaskKind",
    "choose_provider",
]
