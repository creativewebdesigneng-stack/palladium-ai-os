import pytest

from astra_x.providers import (
    LocalOpenAICompatibleProvider,
    ProviderConfigurationError,
    validate_loopback_base_url,
)


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost:11434/v1",
        "http://127.0.0.1:8080/v1",
        "http://[::1]:8080/v1",
        "https://localhost:8443/v1",
    ],
)
def test_loopback_urls_are_accepted(url: str) -> None:
    assert validate_loopback_base_url(url).startswith(("http://", "https://"))


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/v1",
        "http://192.168.1.10:11434/v1",
        "http://10.0.0.5:8080/v1",
        "file:///etc/passwd",
        "http://user:password@localhost:11434/v1",
        "http://localhost:11434/v1?token=secret",
        "http://localhost:badport/v1",
    ],
)
def test_non_loopback_or_unsafe_urls_are_rejected(url: str) -> None:
    with pytest.raises(ProviderConfigurationError):
        validate_loopback_base_url(url)


def test_model_id_is_required() -> None:
    with pytest.raises(ProviderConfigurationError):
        LocalOpenAICompatibleProvider(
            base_url="http://127.0.0.1:8080/v1",
            model=" ",
            bearer_token="test-token",
        )


def test_authenticated_proxy_token_is_required() -> None:
    with pytest.raises(ProviderConfigurationError):
        LocalOpenAICompatibleProvider(
            base_url="http://127.0.0.1:8080/v1",
            model="qwen3:8b-q4_K_M",
            bearer_token=" ",
        )


def test_request_limits_are_validated_before_network_access() -> None:
    provider = LocalOpenAICompatibleProvider(
        base_url="http://127.0.0.1:8080/v1",
        model="qwen3:8b-q4_K_M",
        bearer_token="test-token",
    )
    with pytest.raises(ValueError):
        provider.chat([], max_tokens=100)
    with pytest.raises(ValueError):
        provider.chat([{"role": "user", "content": "hello"}], max_tokens=9000)
    with pytest.raises(ValueError):
        provider.chat([{"role": "system", "content": "hello"}], temperature=2.1)
