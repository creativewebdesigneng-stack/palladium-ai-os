"""Deterministic, local-first provider selection for Astra X.

Routing is deliberately separate from inference. This module never makes
network requests, reads credentials, executes generated code, or silently
falls back to a paid provider.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
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
        if not isinstance(self.context_window, int) or isinstance(self.context_window, bool) or self.context_window < 1:
            raise ValueError("Context window must be a positive integer")
        if not isinstance(self.local, bool) or not isinstance(self.enabled, bool):
            raise ValueError("Provider locality and enabled flags must be boolean")
        if not all(isinstance(task, TaskKind) for task in self.supported_tasks):
            raise ValueError("Provider tasks must use TaskKind values")
        costs = (self.input_cost_per_million, self.output_cost_per_million)
        if not all(math.isfinite(cost) and cost >= 0 for cost in costs):
            raise ValueError("Provider costs must be finite and non-negative")


@dataclass(frozen=True, slots=True)
class RoutingPolicy:
    """Explicit routing constraints; remote inference is disabled by default."""

    allow_remote: bool = False
    max_input_cost_per_million: float = 0.0
    max_output_cost_per_million: float = 0.0
    prefer_local: bool = True

    def __post_init__(self) -> None:
        limits = (self.max_input_cost_per_million, self.max_output_cost_per_million)
        if not all(math.isfinite(limit) and limit >= 0 for limit in limits):
            raise ValueError("Cost limits must be finite and non-negative")
        if not isinstance(self.allow_remote, bool) or not isinstance(self.prefer_local, bool):
            raise ValueError("Routing policy flags must be boolean")


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
