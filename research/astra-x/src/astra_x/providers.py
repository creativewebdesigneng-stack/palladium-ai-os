"""Local-only OpenAI-compatible chat adapter.

Intended for a local Astra X process talking to the existing localhost-bound
Blackstar provider proxy. Remote hosts and redirects are rejected.
"""

from __future__ import annotations

import ipaddress
import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Mapping, Sequence


class ProviderConfigurationError(ValueError):
    """Raised when a provider endpoint violates the local-only policy."""


class ProviderRequestError(RuntimeError):
    """Raised when a local provider request fails or returns invalid data."""


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(
        self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str
    ) -> None:
        return None


@dataclass(frozen=True, slots=True)
class ChatResult:
    content: str
    model: str
    finish_reason: str | None


def validate_loopback_base_url(base_url: str) -> str:
    """Normalise a URL only if it targets localhost or a loopback IP."""
    parsed = urllib.parse.urlsplit(base_url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise ProviderConfigurationError("Local provider URL must use http or https.")
    if not parsed.hostname:
        raise ProviderConfigurationError("Local provider URL must include a hostname.")
    if parsed.username is not None or parsed.password is not None:
        raise ProviderConfigurationError("Credentials must not be embedded in the provider URL.")
    if parsed.query or parsed.fragment:
        raise ProviderConfigurationError("Provider URL must not contain a query or fragment.")
    try:
        parsed.port
    except ValueError as exc:
        raise ProviderConfigurationError("Provider URL contains an invalid port.") from exc

    hostname = parsed.hostname.casefold()
    is_loopback = hostname == "localhost"
    if not is_loopback:
        try:
            is_loopback = ipaddress.ip_address(hostname).is_loopback
        except ValueError:
            is_loopback = False
    if not is_loopback:
        raise ProviderConfigurationError(
            "Astra X local adapter only permits localhost/loopback endpoints."
        )

    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", "")
    )


class LocalOpenAICompatibleProvider:
    """Minimal bounded chat client for a localhost OpenAI-compatible proxy."""

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        bearer_token: str | None = None,
        timeout_seconds: float = 45.0,
        max_response_bytes: int = 2_000_000,
    ) -> None:
        self.base_url = validate_loopback_base_url(base_url)
        if not model.strip():
            raise ProviderConfigurationError("An explicit model ID is required.")
        if timeout_seconds <= 0:
            raise ProviderConfigurationError("Timeout must be positive.")
        if max_response_bytes < 1:
            raise ProviderConfigurationError("Response size limit must be positive.")
        self.model = model.strip()
        self._bearer_token = bearer_token
        self.timeout_seconds = timeout_seconds
        self.max_response_bytes = max_response_bytes
        self._opener = urllib.request.build_opener(_NoRedirectHandler())

    def chat(
        self,
        messages: Sequence[Mapping[str, str]],
        *,
        max_tokens: int = 512,
        temperature: float = 0.2,
    ) -> ChatResult:
        if not messages:
            raise ValueError("At least one message is required.")
        if max_tokens < 1 or max_tokens > 8192:
            raise ValueError("max_tokens must be between 1 and 8192.")
        if temperature < 0 or temperature > 2:
            raise ValueError("temperature must be between 0 and 2.")

        safe_messages: list[dict[str, str]] = []
        for message in messages:
            role = message.get("role")
            content = message.get("content")
            if role not in {"system", "user", "assistant"} or not isinstance(content, str):
                raise ValueError("Messages must contain a supported role and string content.")
            safe_messages.append({"role": role, "content": content})

        payload = json.dumps(
            {
                "model": self.model,
                "messages": safe_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": False,
            }
        ).encode("utf-8")

        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self._bearer_token:
            headers["Authorization"] = f"Bearer {self._bearer_token}"

        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            with self._opener.open(request, timeout=self.timeout_seconds) as response:
                raw = response.read(self.max_response_bytes + 1)
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise ProviderRequestError("Local provider request failed.") from exc

        if len(raw) > self.max_response_bytes:
            raise ProviderRequestError("Local provider response exceeded the configured size limit.")
        try:
            body = json.loads(raw.decode("utf-8"))
            choice = body["choices"][0]
            content = choice["message"]["content"]
            returned_model = body.get("model", self.model)
            finish_reason = choice.get("finish_reason")
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
            raise ProviderRequestError("Local provider returned an invalid chat response.") from exc

        if not isinstance(content, str) or not isinstance(returned_model, str):
            raise ProviderRequestError("Local provider response fields have invalid types.")

        return ChatResult(
            content=content,
            model=returned_model,
            finish_reason=finish_reason if isinstance(finish_reason, str) else None,
        )
