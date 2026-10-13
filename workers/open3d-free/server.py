"""Blackstar Open3D worker — authenticated, no paid inference calls.
Requires separately installed MIT-licensed Shap-E/TripoSR/TRELLIS packages/model weights.
Python standard library HTTP service. One inference job at a time; durable SQLite statuses.
"""
from __future__ import annotations

import hmac
import importlib.util
import ipaddress
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(os.environ.get("OPEN3D_DATA_DIR", "./open3d-data")).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)
DB = ROOT / "jobs.sqlite3"
TOKEN = os.environ.get("OPEN3D_WORKER_TOKEN", "")
PUBLIC_URL = os.environ.get("OPEN3D_PUBLIC_URL", "").rstrip("/")
ALLOWED_HOSTS = {host.strip().lower() for host in os.environ.get("OPEN3D_ALLOWED_IMAGE_HOSTS", "").split(",") if host.strip()}
JOB_TIMEOUT = int(os.environ.get("OPEN3D_JOB_TIMEOUT", "3600"))
MAX_UPLOAD = 16 * 1024 * 1024
SEMAPHORE = threading.Semaphore(1)
MAX_ACTIVE = 3
DB_LOCK = threading.Lock()


def init_db():
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS jobs
            (id TEXT PRIMARY KEY, generator TEXT NOT NULL, status TEXT NOT NULL,
             output_url TEXT, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)""")
        connection.execute("UPDATE jobs SET status='failed', error='Worker restarted before completion.' WHERE status IN ('queued','running')")
        connection.commit()


def get_job(jid):
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.row_factory = sqlite3.Row
        value = connection.execute("SELECT * FROM jobs WHERE id=?", (jid,)).fetchone()
        return dict(value) if value else None


def update_job(jid, **values):
    allowed = {"status", "output_url", "error"}
    assert set(values) <= allowed
    columns = list(values)
    if not columns:
        return
    values["updated_at"] = int(time.time())
    columns.append("updated_at")
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.execute(
            "UPDATE jobs SET " + ", ".join(f"{column}=?" for column in columns) + " WHERE id=?",
            [values[column] for column in columns] + [jid],
        )
        connection.commit()


def gpu_memory_gb():
    try:
        import torch
        if torch.cuda.is_available():
            prop = torch.cuda.get_device_properties(0)
            return prop.total_memory / (1024**3)
    except Exception:
        pass
    return 0.0


def installed_models():
    cuda_memory = gpu_memory_gb()
    shap_python = os.environ.get("OPEN3D_SHAPE_PYTHON", sys.executable)
    triposr_python = os.environ.get("OPEN3D_TRIPOSR_PYTHON", sys.executable)
    trellis_python = os.environ.get("OPEN3D_TRELLIS_PYTHON", sys.executable)
    # Explicit flags signal the worker administrator installed each model in the indicated venv.
    # TRELLIS must have a compatible NVIDIA CUDA runtime and >=16 GB GPU memory.
    return [
        {"id": "shap-e", "ready": os.environ.get("OPEN3D_ENABLE_SHAPE_E") == "1" and Path(shap_python).is_file()},
        {"id": "triposr", "ready": os.environ.get("OPEN3D_ENABLE_TRIPOSR") == "1"
         and Path(triposr_python).is_file() and (Path(os.environ.get("OPEN3D_TRIPOSR_REPO", "")) / "run.py").is_file()},
        {"id": "trellis", "ready": os.environ.get("OPEN3D_ENABLE_TRELLIS") == "1"
         and Path(trellis_python).is_file() and cuda_memory >= 16.0},
    ]


def safe_source(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("An HTTPS public image URL is required.")
    if not ALLOWED_HOSTS or parsed.hostname.lower() not in ALLOWED_HOSTS:
        raise ValueError("Image hostname is not on the worker allowlist.")
    # An allowlisted public hostname must not point directly at private infrastructure.
    addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(result[4][0]).is_global for result in addresses):
        raise ValueError("The image URL resolves to a private or reserved network address.")
    return parsed.geturl()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError("Image URL redirects are not allowed.")


def download_image(url, destination):
    safe_source(url)
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": "BlackstarOpen3D/1.0"})
    with opener.open(request, timeout=30) as response:
        media = response.headers.get("Content-Type", "").split(";")[0].lower()
        if media not in {"image/png", "image/jpeg", "image/webp", "image/avif"}:
            raise ValueError("Source URL did not return a supported image type.")
        if int(response.headers.get("Content-Length", "0") or 0) > MAX_UPLOAD:
            raise ValueError("Source image is larger than the worker's 16 MB limit.")
        with destination.open("wb") as handle:
            received = 0
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                received += len(chunk)
                if received > MAX_UPLOAD:
                    raise ValueError("Source image exceeds 16 MB.")
                handle.write(chunk)


def run_job(jid, payload):
    with SEMAPHORE:
        folder = ASSETS / jid
        folder.mkdir(parents=True, exist_ok=True)
        update_job(jid, status="running")
        generator = payload["generator"]
        output_format = payload["output_format"]
        try:
            if payload["source_kind"] == "image":
                image = folder / "source.png"
                download_image(payload["source_url"], image)
            else:
                image = None
            script = str(Path(__file__).with_name("run_model.py"))
            args = [
                {"shap-e": os.environ.get("OPEN3D_SHAPE_PYTHON", sys.executable),
                 "triposr": os.environ.get("OPEN3D_TRIPOSR_PYTHON", sys.executable),
                 "trellis": os.environ.get("OPEN3D_TRELLIS_PYTHON", sys.executable)}[generator],
                script, "--generator", generator, "--output", str(folder / ("model." + output_format)),
                "--format", output_format,
            ]
            if image:
                args.extend(["--image", str(image)])
            if payload.get("prompt") and payload["source_kind"] == "prompt":
                args.extend(["--prompt", payload["prompt"]])
            if generator == "triposr":
                args.extend(["--triposr-repo", os.environ["OPEN3D_TRIPOSR_REPO"]])
            # Only direct argv exec, no shell, no external paid API or arbitrary commands.
            subprocess.run(args, timeout=JOB_TIMEOUT, check=True, cwd=str(folder),
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            output = folder / ("model." + output_format)
            if not output.is_file() or output.stat().st_size < 128:
                raise RuntimeError("The local model did not produce a usable geometry file.")
            update_job(jid, status="completed",
                       output_url=f"{PUBLIC_URL}/assets/{jid}/{output.name}", error=None)
        except subprocess.TimeoutExpired:
            update_job(jid, status="failed", error="Local model inference exceeded the configured runtime limit.")
        except (ValueError, RuntimeError) as exc:
            update_job(jid, status="failed", error=str(exc)[:180])
        except Exception:
            update_job(jid, status="failed", error="The local 3D model failed to generate a usable mesh. Check worker logs and installed dependencies.")


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        if not TOKEN or not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + TOKEN):
            self.reply(401, {"error": "Worker authentication is required."})
            return False
        return True

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path.startswith("/assets/"):
            parts = path.strip("/").split("/")
            if len(parts) != 3 or parts[0] != "assets" or not _uuid(parts[1]) or parts[2] not in ("model.glb", "model.obj"):
                return self.reply(404, {"error": "Asset not found."})
            job = get_job(parts[1])
            file = ASSETS / parts[1] / parts[2]
            if not job or job["status"] != "completed" or not file.is_file():
                return self.reply(404, {"error": "Asset not found."})
            self.send_response(200)
            self.send_header("Content-Type", "model/gltf-binary" if parts[2].endswith("glb") else "text/plain")
            self.send_header("Content-Length", str(file.stat().st_size))
            self.send_header("Access-Control-Allow-Origin", os.environ.get("OPEN3D_ASSET_CORS_ORIGIN", "null"))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            with file.open("rb") as handle:
                shutil.copyfileobj(handle, self.wfile)
            return
        if not self.authorized():
            return
        if path == "/v1/health":
            return self.reply(200, {"status": "ok", "models": installed_models()})
        if path.startswith("/v1/assets/jobs/"):
            jid = path.removeprefix("/v1/assets/jobs/")
            job = get_job(jid) if _uuid(jid) else None
            return self.reply(200, {"id": jid, "status": job["status"], "output_url": job["output_url"],
                                    "error": job["error"]}) if job else self.reply(404, {"error": "Job not found."})
        return self.reply(404, {"error": "Unknown endpoint."})

    def do_POST(self):
        if not self.authorized():
            return
        if urllib.parse.urlsplit(self.path).path != "/v1/assets/generate":
            return self.reply(404, {"error": "Unknown endpoint."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 12000:
                return self.reply(413, {"error": "Invalid generation request size."})
            data = json.loads(self.rfile.read(size))
            gen = data.get("generator")
            kind = data.get("source_kind")
            fmt = data.get("output_format")
            if gen not in ("shap-e", "triposr", "trellis") or kind not in ("image", "prompt"):
                return self.reply(422, {"error": "Unsupported model or source type."})
            if gen == "triposr" and kind != "image":
                return self.reply(422, {"error": "TripoSR needs an image."})
            if fmt not in ("obj", "glb"):
                return self.reply(422, {"error": "Only OBJ and GLB output is supported."})
            if kind == "prompt" and not (isinstance(data.get("prompt"), str) and 0 < len(data["prompt"]) <= 10000):
                return self.reply(422, {"error": "A valid text prompt is required."})
            if kind == "image":
                if not isinstance(data.get("source_url"), str):
                    return self.reply(422, {"error": "An image URL is required."})
                safe_source(data["source_url"])
            if gen not in {item["id"] for item in installed_models() if item["ready"]}:
                return self.reply(503, {"error": "This model is not installed or lacks the required GPU."})
            with DB_LOCK, sqlite3.connect(DB) as connection:
                active = connection.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0]
                if active >= MAX_ACTIVE:
                    return self.reply(429, {"error": "Worker queue capacity reached."})
                jid = str(uuid.uuid4())
                now = int(time.time())
                connection.execute("INSERT INTO jobs (id,generator,status,created_at,updated_at) VALUES (?,?,?,?,?)",
                                   (jid, gen, "queued", now, now))
                connection.commit()
            threading.Thread(target=run_job, args=(jid, data), daemon=True).start()
            return self.reply(202, {"id": jid, "status": "queued"})
        except (ValueError, TypeError, json.JSONDecodeError):
            return self.reply(422, {"error": "Invalid request or disallowed source URL."})

    def log_message(self, format, *args):
        # Suppress query strings: signed source URLs must never be printed.
        pass


def _uuid(value):
    try:
        return str(uuid.UUID(value)) == value
    except (ValueError, AttributeError):
        return False


if __name__ == "__main__":
    if not TOKEN or len(TOKEN) < 24 or not PUBLIC_URL.startswith("https://"):
        raise SystemExit("OPEN3D_WORKER_TOKEN (24+ chars) and HTTPS OPEN3D_PUBLIC_URL are required.")
    init_db()
    bind = os.environ.get("OPEN3D_BIND", "127.0.0.1")
    port = int(os.environ.get("PORT", "8765"))
    print(f"Blackstar Open3D worker listening on {bind}:{port}, ready models: {installed_models()}", flush=True)
    ThreadingHTTPServer((bind, port), Handler).serve_forever()
