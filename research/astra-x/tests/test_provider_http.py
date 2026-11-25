import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from astra_x.providers import (
    LocalOpenAICompatibleProvider,
    ProviderRequestError,
)


class ResponseHandler(BaseHTTPRequestHandler):
    payload = b'{"model":"local-test","choices":[{"message":{"content":"hello"},"finish_reason":"stop"}]}'
    status = 200
    seen_authorization = None

    def do_POST(self):
        type(self).seen_authorization = self.headers.get("Authorization")
        self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self.send_response(type(self).status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(type(self).payload)))
        self.end_headers()
        self.wfile.write(type(self).payload)

    def log_message(self, format, *args):
        pass


@pytest.fixture
def local_server():
    server = HTTPServer(("127.0.0.1", 0), ResponseHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server.server_address[1]
    finally:
        server.shutdown()
        thread.join(timeout=2)
        server.server_close()


def make_provider(port, **kwargs):
    return LocalOpenAICompatibleProvider(
        base_url=f"http://127.0.0.1:{port}/v1",
        model="test-model",
        bearer_token="test-secret",
        **kwargs,
    )


def test_local_http_chat_sends_bearer_and_parses_response(local_server):
    ResponseHandler.payload = (
        b'{"model":"local-test","choices":[{"message":{"content":"hello"},'
        b'"finish_reason":"stop"}]}'
    )
    ResponseHandler.status = 200
    result = make_provider(local_server).chat(
        [{"role": "user", "content": "hi"}],
        max_tokens=20,
        temperature=0,
    )
    assert result.content == "hello"
    assert result.model == "local-test"
    assert result.finish_reason == "stop"
    assert ResponseHandler.seen_authorization == "Bearer test-secret"


def test_redirect_is_rejected(local_server):
    ResponseHandler.status = 302
    ResponseHandler.payload = b""
    with pytest.raises(ProviderRequestError):
        make_provider(local_server).chat([{"role": "user", "content": "hi"}])


def test_oversized_response_is_rejected(local_server):
    ResponseHandler.status = 200
    ResponseHandler.payload = b"x" * 128
    with pytest.raises(ProviderRequestError, match="size limit"):
        make_provider(local_server, max_response_bytes=32).chat(
            [{"role": "user", "content": "hi"}]
        )
