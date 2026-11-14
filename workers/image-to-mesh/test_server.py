import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

os.environ["MESH_DATA_DIR"] = tempfile.mkdtemp(prefix="mesh-worker-")
os.environ["MESH_WORKER_TOKEN"] = "t" * 24
os.environ["MESH_PUBLIC_URL"] = "https://mesh.example.com"
os.environ.pop("TRIPOSR_REPO", None)
os.environ.pop("TRIPOSR_PYTHON", None)
os.environ.pop("THREE_D_HF_ENDPOINT_URL", None)
os.environ.pop("HF_TOKEN", None)
os.environ.pop("HUGGINGFACE_TOKEN", None)

import server  # noqa: E402


class ImageToMeshWorkerTest(unittest.TestCase):
    def test_health_stays_unready_without_an_engine(self):
        report = server.health_payload()
        self.assertFalse(report["ready"])
        self.assertIn("TripoSR", report["error"])
        self.assertEqual(report["provider"], "blackstar-image-to-mesh")

    def test_health_is_ready_when_hugging_face_is_configured(self):
        os.environ["THREE_D_HF_ENDPOINT_URL"] = "https://example.endpoints.huggingface.cloud/models/triposr"
        os.environ["HF_TOKEN"] = "hf_test_token"
        try:
            report = server.health_payload()
            self.assertTrue(report["ready"])
            self.assertEqual(report["workflows"], ["image-to-mesh"])
            self.assertIn("glb", report["formats"])
            self.assertTrue(report["engines"]["huggingface"])
        finally:
            os.environ.pop("THREE_D_HF_ENDPOINT_URL", None)
            os.environ.pop("HF_TOKEN", None)

    def test_private_image_urls_are_rejected(self):
        with self.assertRaises(ValueError):
            server.public_image_url("http://127.0.0.1/private.png")
        with self.assertRaises(ValueError):
            server.public_image_url("https://10.1.1.5/private.png")

    def test_job_api_requires_auth_and_a_ready_engine(self):
        server.init_db()
        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        port = httpd.server_address[1]
        try:
            with self.assertRaises(urllib.error.HTTPError) as blocked:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/workflow-runs/from-image", data=b"{}")
            self.assertEqual(blocked.exception.code, 401)
            request = urllib.request.Request(
                f"http://127.0.0.1:{port}/workflow-runs/from-image",
                data=json.dumps({"image_url": "https://assets.example.com/reference.png", "output_format": "glb"}).encode(),
                headers={"Authorization": "Bearer " + os.environ["MESH_WORKER_TOKEN"], "Content-Type": "application/json"},
            )
            with self.assertRaises(urllib.error.HTTPError) as unavailable:
                urllib.request.urlopen(request)
            self.assertEqual(unavailable.exception.code, 503)
            health = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/health").read())
            self.assertFalse(health["ready"])
        finally:
            httpd.shutdown()
            httpd.server_close()

    def test_huggingface_bytes_become_a_real_output_url(self):
        os.environ["THREE_D_HF_ENDPOINT_URL"] = "https://example.endpoints.huggingface.cloud/models/triposr"
        os.environ["HF_TOKEN"] = "hf_test_token"
        server.init_db()
        job_id = "11111111-1111-4111-8111-111111111111"
        with server.DB_LOCK, server.sqlite3.connect(server.DB) as connection:
            connection.execute(
                "INSERT INTO jobs (id,status,format,created_at,updated_at) VALUES (?,?,?,?,?)",
                (job_id, "queued", "glb", 1, 1),
            )
        def fake(_url, _fmt, destination):
            destination.write_bytes(b"glTF" + b"\0" * 140)
            return None
        original = server.run_huggingface
        server.run_huggingface = fake
        try:
            server.execute(job_id, "https://assets.example.com/reference.png", "glb")
            job = server.get_job(job_id)
            self.assertEqual(job["status"], "completed")
            self.assertEqual(job["output_url"], f"https://mesh.example.com/outputs/{job_id}/model.glb")
            self.assertGreater(Path(server.OUTPUTS / job_id / "model.glb").stat().st_size, 128)
        finally:
            server.run_huggingface = original
            os.environ.pop("THREE_D_HF_ENDPOINT_URL", None)
            os.environ.pop("HF_TOKEN", None)


    def test_gltf_export_splits_a_real_glb_and_does_not_invent_one(self):
        os.environ["THREE_D_HF_ENDPOINT_URL"] = "https://example.endpoints.huggingface.cloud/models/triposr"
        os.environ["HF_TOKEN"] = "hf_test_token"
        server.init_db()
        job_id = "33333333-3333-4333-8333-333333333333"
        with server.DB_LOCK, server.sqlite3.connect(server.DB) as connection:
            connection.execute(
                "INSERT INTO jobs (id,status,format,created_at,updated_at) VALUES (?,?,?,?,?)",
                (job_id, "queued", "gltf", 1, 1),
            )
        document = {"asset": {"version": "2.0"}, "buffers": [{"byteLength": 36}], "extras": {"note": "x" * 96}}
        raw_json = json.dumps(document).encode()
        pad = (4 - (len(raw_json) % 4)) % 4
        bin_bytes = b"\x00" * 36
        total = 12 + 8 + len(raw_json) + pad + 8 + len(bin_bytes)
        payload = b"glTF" + (2).to_bytes(4, "little") + total.to_bytes(4, "little")
        payload += (len(raw_json) + pad).to_bytes(4, "little") + b"JSON" + raw_json + (b" " * pad)
        payload += len(bin_bytes).to_bytes(4, "little") + b"BIN\x00" + bin_bytes
        self.assertGreaterEqual(len(payload), 128)

        def fake(_url, _fmt, destination):
            destination.write_bytes(payload)
            return None

        original = server.run_huggingface
        server.run_huggingface = fake
        try:
            server.execute(job_id, "https://assets.example.com/reference.png", "gltf")
            job = server.get_job(job_id)
            self.assertEqual(job["status"], "completed")
            self.assertTrue(job["output_url"].endswith("/model.gltf"))
            written = json.loads((server.OUTPUTS / job_id / "model.gltf").read_text())
            self.assertEqual(written["buffers"][0]["uri"], "model.bin")
            self.assertEqual((server.OUTPUTS / job_id / "model.bin").read_bytes(), bin_bytes)
        finally:
            server.run_huggingface = original
            os.environ.pop("THREE_D_HF_ENDPOINT_URL", None)
            os.environ.pop("HF_TOKEN", None)


if __name__ == "__main__":
    unittest.main()
