"""Bounded agent-plan contracts and policy validation.

This module validates proposed plans only. It does not execute tools, run code,
open network connections or grant permissions.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from enum import StrEnum
from typing import Mapping


class ActionKind(StrEnum):
    ANSWER = "answer"
    TOOL_CALL = "tool_call"
    CODE_EXECUTION = "code_execution"
    NETWORK_REQUEST = "network_request"


class SideEffect(StrEnum):
    NONE = "none"
    LOCAL_WRITE = "local_write"
    EXTERNAL_WRITE = "external_write"


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    tool_id: str
    enabled: bool
    allowed_argument_keys: frozenset[str]
    required_argument_keys: frozenset[str] = frozenset()
    side_effect: SideEffect = SideEffect.NONE

    def __post_init__(self) -> None:
        if not self.tool_id.strip():
            raise ValueError("Tool ID must not be empty.")
        if not self.required_argument_keys.issubset(self.allowed_argument_keys):
            raise ValueError("Required tool arguments must be allowed arguments.")
        if not isinstance(self.enabled, bool):
            raise ValueError("Tool enabled flag must be boolean.")


@dataclass(frozen=True, slots=True)
class PlanStep:
    step_id: str
    action: ActionKind
    objective: str
    tool_id: str | None = None
    arguments: Mapping[str, object] | None = None


@dataclass(frozen=True, slots=True)
class AgentPlan:
    task_id: str
    steps: tuple[PlanStep, ...]


@dataclass(frozen=True, slots=True)
class AgentPolicy:
    allowed_tools: frozenset[str] = frozenset()
    max_steps: int = 8
    max_argument_bytes: int = 16_384
    allow_code_execution: bool = False
    allow_network_requests: bool = False


@dataclass(frozen=True, slots=True)
class PlanValidation:
    allowed: bool
    errors: tuple[str, ...]
    approval_required: tuple[str, ...]


def validate_plan(
    plan: AgentPlan,
    tools: Mapping[str, ToolDefinition],
    policy: AgentPolicy = AgentPolicy(),
    *,
    approved_step_ids: frozenset[str] = frozenset(),
) -> PlanValidation:
    """Validate a plan against a tool allowlist and explicit approval policy."""
    errors: list[str] = []
    approvals: list[str] = []

    if not plan.task_id.strip():
        errors.append("Task ID must not be empty.")
    if not isinstance(policy.max_steps, int) or isinstance(policy.max_steps, bool) or policy.max_steps < 1:
        errors.append("Maximum step count must be a positive integer.")
    if not isinstance(policy.max_argument_bytes, int) or isinstance(policy.max_argument_bytes, bool) or policy.max_argument_bytes < 1:
        errors.append("Maximum argument size must be a positive integer.")
    if len(plan.steps) > policy.max_steps:
        errors.append("Plan exceeds the configured step limit.")

    seen: set[str] = set()
    for step in plan.steps:
        if not step.step_id.strip() or step.step_id in seen:
            errors.append("Plan contains an empty or duplicate step ID.")
            continue
        seen.add(step.step_id)
        if not step.objective.strip():
            errors.append(f"Step {step.step_id} has no objective.")

        if step.action == ActionKind.ANSWER:
            if step.tool_id is not None or step.arguments:
                errors.append(f"Answer step {step.step_id} cannot contain tool details.")
            continue

        if step.action == ActionKind.CODE_EXECUTION and not policy.allow_code_execution:
            errors.append(f"Code execution is disabled for step {step.step_id}.")
            continue
        if step.action == ActionKind.NETWORK_REQUEST and not policy.allow_network_requests:
            errors.append(f"Network requests are disabled for step {step.step_id}.")
            continue

        if step.action != ActionKind.TOOL_CALL:
            if step.tool_id is not None or step.arguments:
                errors.append(f"Non-tool step {step.step_id} cannot contain tool details.")
            continue

        if not step.tool_id or step.tool_id not in policy.allowed_tools:
            errors.append(f"Tool for step {step.step_id} is not allowlisted.")
            continue
        definition = tools.get(step.tool_id)
        if definition is None or not definition.enabled:
            errors.append(f"Tool for step {step.step_id} is not registered and enabled.")
            continue

        arguments = dict(step.arguments or {})
        keys = frozenset(arguments)
        if not keys.issubset(definition.allowed_argument_keys):
            errors.append(f"Tool step {step.step_id} contains unsupported arguments.")
            continue
        if not definition.required_argument_keys.issubset(keys):
            errors.append(f"Tool step {step.step_id} is missing required arguments.")
            continue
        try:
            encoded = json.dumps(arguments, ensure_ascii=False, allow_nan=False).encode("utf-8")
        except (TypeError, ValueError):
            errors.append(f"Tool step {step.step_id} arguments are not safe JSON values.")
            continue
        if len(encoded) > policy.max_argument_bytes:
            errors.append(f"Tool step {step.step_id} arguments exceed the size limit.")
            continue

        if definition.side_effect != SideEffect.NONE and step.step_id not in approved_step_ids:
            approvals.append(step.step_id)

    unknown_approvals = approved_step_ids.difference(seen)
    if unknown_approvals:
        errors.append("Approval set contains step IDs that are not in this plan.")

    return PlanValidation(
        allowed=not errors and not approvals,
        errors=tuple(errors),
        approval_required=tuple(approvals),
    )
