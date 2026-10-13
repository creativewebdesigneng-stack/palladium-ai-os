"""Zero-credit Open3D worker protocol and safety regression tests (no GPU/models required)."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

TEMP = tempfile.TemporaryDirectory()
os.environ["OPEN3D_DATA_DIR"] = TEMP.name
os.environ["OPEN3D_WORKER_TOKEN"] = "ci-test-long-private-worker-token"
os.environ["OPEN3D_PUBLIC_URL"] = "https://worker.example.test"
os.environ["OPEN3D_ALLOWED_IMAGE_HOSTS"] = "images.example.test"

spec = importlib.util.spec_from_file_location("blackstar_open3d_server", Path(__file__).with_name("server.py"))
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class WorkerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.init_db()
        cls.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.port = cls.httpd.server_address[1]
        cls.runner = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.runner.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def request(self, path, token=True, payload=None):
        headers = {"Authorization": "Bearer " + server.TOKEN} if token else {}
        if payload is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            "http://127.0.0.1:" + str(self.port) + path,
            headers=headers,
            data=json.dumps(payload).encode() if payload is not None else None,
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    def test_no_unauthorized_job_info_or_health(self):
        self.assertEqual(self.request("/v1/health", token=False)[0], 401)
        self.assertEqual(self.request("/v1/assets/jobs/123e4567-e89b-12d3-a456-426614174000", token=False)[0], 401)

    def test_health_has_no_mocks_or_fake_ready_models(self):
        status, data = self.request("/v1/health")
        self.assertEqual(status, 200)
        self.assertEqual([entry["id"] for entry in data["models"]], ["shap-e", "triposr", "trellis"])
        self.assertTrue(all(not entry["ready"] for entry in data["models"]))

    def test_triposr_text_is_rejected(self):
        code, _ = self.request("/v1/assets/generate", payload={
            "generator": "triposr", "source_kind": "prompt",
            "output_format": "glb", "prompt": "a car",
        })
        self.assertEqual(code, 422)

    def test_wrong_format_is_rejected_without_queueing(self):
        code, _ = self.request("/v1/assets/generate", payload={
            "generator": "shap-e", "source_kind": "prompt",
            "output_format": "fbx", "prompt": "a car",
        })
        self.assertEqual(code, 422)

    def test_uninstalled_generator_refuses_job(self):
        code, message = self.request("/v1/assets/generate", payload={
            "generator": "shap-e", "source_kind": "prompt",
            "output_format": "obj", "prompt": "a car",
        })
        self.assertEqual(code, 503)
        self.assertIn("not installed", message["error"])
        with server.sqlite3.connect(server.DB) as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM jobs").fetchone()[0], 0)

    def test_blocked_ssrf_hosts_fail_closed(self):
        for url in ["http://images.example.test/test.png", "https://127.0.0.1/test.png",
                    "https://not-allowlisted.example.test/test.png"]:
            with self.assertRaises(ValueError):
                server.safe_source(url)

    def test_rejects_private_dns_resolution(self):
        private = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))]
        with patch.object(server.socket, "getaddrinfo", return_value=private):
            with self.assertRaises(ValueError):
                server.safe_source("https://images.example.test/test.png")

    def test_invalid_output_paths_do_not_return_files(self):
        for path in ["/assets/../../etc/passwd", "/assets/invalid-id/model.obj"]:
            self.assertEqual(self.request(path, token=False)[0], 404)


if __name__ == "__main__":
    unittest.main()
