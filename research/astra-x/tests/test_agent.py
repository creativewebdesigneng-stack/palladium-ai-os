import pytest

from astra_x.agent import (
    ActionKind,
    AgentPlan,
    AgentPolicy,
    PlanStep,
    SideEffect,
    ToolDefinition,
    validate_plan,
)


def test_read_only_allowlisted_tool_is_accepted():
    tools = {
        "docs.search": ToolDefinition(
            tool_id="docs.search",
            enabled=True,
            allowed_argument_keys=frozenset({"query"}),
            required_argument_keys=frozenset({"query"}),
        )
    }
    plan = AgentPlan(
        task_id="task-1",
        steps=(PlanStep("step-1", ActionKind.TOOL_CALL, "Search docs", "docs.search", {"query": "local inference"}),),
    )
    result = validate_plan(plan, tools, AgentPolicy(allowed_tools=frozenset({"docs.search"})))
    assert result.allowed is True
    assert result.errors == ()
    assert result.approval_required == ()


def test_unregistered_tool_is_rejected():
    plan = AgentPlan(
        "task-1",
        (PlanStep("step-1", ActionKind.TOOL_CALL, "Run tool", "shell.exec", {"cmd": "whoami"}),),
    )
    result = validate_plan(plan, {}, AgentPolicy(allowed_tools=frozenset({"shell.exec"})))
    assert result.allowed is False
    assert any("not registered" in error or "not allowlisted" in error for error in result.errors)


def test_side_effecting_tool_requires_explicit_approval():
    tools = {
        "files.write": ToolDefinition(
            "files.write",
            True,
            frozenset({"path", "content"}),
            frozenset({"path", "content"}),
            SideEffect.LOCAL_WRITE,
        )
    }
    plan = AgentPlan(
        "task-1",
        (PlanStep("step-1", ActionKind.TOOL_CALL, "Write a file", "files.write", {"path": "draft.txt", "content": "hello"}),),
    )
    policy = AgentPolicy(allowed_tools=frozenset({"files.write"}))
    pending = validate_plan(plan, tools, policy)
    assert pending.allowed is False
    assert pending.approval_required == ("step-1",)
    approved = validate_plan(plan, tools, policy, approved_step_ids=frozenset({"step-1"}))
    assert approved.allowed is True


def test_code_execution_and_network_are_denied_by_default():
    plan = AgentPlan(
        "task-1",
        (
            PlanStep("code", ActionKind.CODE_EXECUTION, "Run generated code"),
            PlanStep("net", ActionKind.NETWORK_REQUEST, "Call remote endpoint"),
        ),
    )
    result = validate_plan(plan, {}, AgentPolicy())
    assert result.allowed is False
    assert len(result.errors) == 2


def test_duplicate_steps_and_excess_steps_are_rejected():
    plan = AgentPlan(
        "task-1",
        (
            PlanStep("same", ActionKind.ANSWER, "Answer"),
            PlanStep("same", ActionKind.ANSWER, "Answer again"),
        ),
    )
    result = validate_plan(plan, {}, AgentPolicy(max_steps=1))
    assert result.allowed is False
    assert any("step limit" in error for error in result.errors)
    assert any("duplicate" in error for error in result.errors)


def test_tool_arguments_reject_non_json_values_and_extra_keys():
    tools = {
        "docs.search": ToolDefinition(
            "docs.search",
            True,
            frozenset({"query"}),
            frozenset({"query"}),
        )
    }
    policy = AgentPolicy(allowed_tools=frozenset({"docs.search"}))
    bad_json = AgentPlan(
        "task-1",
        (PlanStep("s1", ActionKind.TOOL_CALL, "Search", "docs.search", {"query": object()}),),
    )
    extra = AgentPlan(
        "task-1",
        (PlanStep("s2", ActionKind.TOOL_CALL, "Search", "docs.search", {"query": "x", "admin": True}),),
    )
    assert validate_plan(bad_json, tools, policy).allowed is False
    assert validate_plan(extra, tools, policy).allowed is False


def test_unknown_approval_id_is_rejected():
    plan = AgentPlan("task-1", (PlanStep("s1", ActionKind.ANSWER, "Answer"),))
    result = validate_plan(plan, {}, approved_step_ids=frozenset({"not-in-plan"}))
    assert result.allowed is False
    assert any("Approval set" in error for error in result.errors)
