"""Deterministic, local-first provider selection for Astra X.

Routing is deliberately separate from inference. This module never makes
network requests, reads credentials, executes generated code, or silently
falls back to a paid provider.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Iterable


class TaskKind(StrEnum):
    REASONING = "reasoning"
    CODING = "coding"
    RESEARCH = "research"
    EMBEDDING = "embedding"


@dataclass(frozen=True, slots=True)
class ProviderDescriptor:
    """A declared provider capability; it is not proof that a model is ready."""

    name: str
    local: bool
    enabled: bool
    supported_tasks: frozenset[TaskKind]
    context_window: int
    input_cost_per_million: float = 0.0
    output_cost_per_million: float = 0.0

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Provider name must not be empty")
        if self.context_window < 1:
            raise ValueError("Context window must be positive")
        if self.input_cost_per_million < 0 or self.output_cost_per_million < 0:
            raise ValueError("Provider costs cannot be negative")


@dataclass(frozen=True, slots=True)
class RoutingPolicy:
    """Explicit routing constraints; remote inference is disabled by default."""

    allow_remote: bool = False
    max_input_cost_per_million: float = 0.0
    max_output_cost_per_million: float = 0.0
    prefer_local: bool = True

    def __post_init__(self) -> None:
        if self.max_input_cost_per_million < 0 or self.max_output_cost_per_million < 0:
            raise ValueError("Cost limits cannot be negative")


@dataclass(frozen=True, slots=True)
class RouteDecision:
    provider_name: str | None
    reason: str
    requires_operator_approval: bool


def choose_provider(
    task: TaskKind,
    providers: Iterable[ProviderDescriptor],
    policy: RoutingPolicy = RoutingPolicy(),
) -> RouteDecision:
    """Select a declared provider without performing inference or fallback."""

    eligible = [
        provider
        for provider in providers
        if provider.enabled
        and task in provider.supported_tasks
        and (provider.local or policy.allow_remote)
        and provider.input_cost_per_million <= policy.max_input_cost_per_million
        and provider.output_cost_per_million <= policy.max_output_cost_per_million
    ]

    if not eligible:
        return RouteDecision(
            provider_name=None,
            reason="No provider satisfies the enabled, capability, locality and cost policy.",
            requires_operator_approval=False,
        )

    eligible.sort(
        key=lambda provider: (
            0 if (provider.local and policy.prefer_local) else 1,
            provider.input_cost_per_million + provider.output_cost_per_million,
            -provider.context_window,
            provider.name.casefold(),
        )
    )
    selected = eligible[0]

    return RouteDecision(
        provider_name=selected.name,
        reason=(
            "Selected by deterministic local-first policy."
            if selected.local
            else "Remote provider selected under an explicitly permissive policy."
        ),
        requires_operator_approval=not selected.local,
    )
