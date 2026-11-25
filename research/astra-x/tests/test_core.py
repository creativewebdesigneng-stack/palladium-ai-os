from astra_x.core import (
    ProviderDescriptor,
    RoutingPolicy,
    TaskKind,
    choose_provider,
)


def provider(
    name: str,
    *,
    local: bool,
    cost: float = 0.0,
    enabled: bool = True,
) -> ProviderDescriptor:
    return ProviderDescriptor(
        name=name,
        local=local,
        enabled=enabled,
        supported_tasks=frozenset({TaskKind.CODING, TaskKind.REASONING}),
        context_window=8_192,
        input_cost_per_million=cost,
        output_cost_per_million=cost,
    )


def test_local_provider_wins_by_default() -> None:
    decision = choose_provider(
        TaskKind.CODING,
        [provider("remote", local=False), provider("local", local=True)],
    )
    assert decision.provider_name == "local"
    assert decision.requires_operator_approval is False


def test_remote_provider_is_never_selected_by_default() -> None:
    decision = choose_provider(TaskKind.CODING, [provider("remote", local=False)])
    assert decision.provider_name is None


def test_remote_requires_explicit_policy_and_operator_approval() -> None:
    decision = choose_provider(
        TaskKind.CODING,
        [provider("remote", local=False, cost=1.0)],
        RoutingPolicy(
            allow_remote=True,
            max_input_cost_per_million=2.0,
            max_output_cost_per_million=2.0,
        ),
    )
    assert decision.provider_name == "remote"
    assert decision.requires_operator_approval is True


def test_cost_ceiling_blocks_remote_provider() -> None:
    decision = choose_provider(
        TaskKind.CODING,
        [provider("remote", local=False, cost=1.0)],
        RoutingPolicy(
            allow_remote=True,
            max_input_cost_per_million=0.0,
            max_output_cost_per_million=0.0,
        ),
    )
    assert decision.provider_name is None


def test_disabled_or_incapable_provider_is_not_selected() -> None:
    disabled = provider("disabled", local=True, enabled=False)
    coding_only = ProviderDescriptor(
        name="coding-only",
        local=True,
        enabled=True,
        supported_tasks=frozenset({TaskKind.CODING}),
        context_window=4_096,
    )
    decision = choose_provider(TaskKind.RESEARCH, [disabled, coding_only])
    assert decision.provider_name is None
