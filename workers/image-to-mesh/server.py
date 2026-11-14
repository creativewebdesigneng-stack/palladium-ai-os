"""Blackstar image-to-mesh worker.

Speaks the 3D Studio contract:
  GET  /health
  POST /workflow-runs/from-image
  GET  /workflow-runs/<id>
  GET  /outputs/<id>/model.glb|model.gltf|model.bin|model.obj

A job runs TripoSR when that repo and interpreter are installed. Otherwise it
calls a configured Hugging Face endpoint. Health is ready only when one of
those lanes can actually run. This process never invents a mesh.
"""
from __future__ import annotations

import hmac
import ipaddress
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import threading
import time
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(os.environ.get("MESH_DATA_DIR", "./mesh-data")).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
OUTPUTS = ROOT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
DB = ROOT / "jobs.sqlite3"
TOKEN = os.environ.get("MESH_WORKER_TOKEN", "").strip()
PUBLIC_URL = os.environ.get("MESH_PUBLIC_URL", "").rstrip("/")
ALLOWED_HOSTS = {host.strip().lower() for host in os.environ.get("MESH_ALLOWED_IMAGE_HOSTS", "").split(",") if host.strip()}
JOB_TIMEOUT = int(os.environ.get("MESH_JOB_TIMEOUT", "900"))
MAX_IMAGE = 16 * 1024 * 1024
MAX_MODEL = 40 * 1024 * 1024
FORMATS = ("glb", "obj", "gltf")
DB_LOCK = threading.Lock()
SEMAPHORE = threading.Semaphore(1)


def init_db():
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS jobs
            (id TEXT PRIMARY KEY, status TEXT NOT NULL, output_url TEXT, preview_url TEXT,
             error TEXT, format TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)""")
        connection.execute("UPDATE jobs SET status='failed', error='Worker restarted before completion.' WHERE status IN ('queued','running')")
        connection.commit()


def get_job(job_id):
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        return dict(row) if row else None


def update_job(job_id, **values):
    allowed = {"status", "output_url", "preview_url", "error"}
    if not set(values) <= allowed:
        raise ValueError("Unexpected job column.")
    values["updated_at"] = int(time.time())
    columns = list(values)
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.execute(
            "UPDATE jobs SET " + ", ".join(f"{column}=?" for column in columns) + " WHERE id=?",
            [values[column] for column in columns] + [job_id],
        )
        connection.commit()


def triposr_ready():
    repo = Path(os.environ.get("TRIPOSR_REPO", ""))
    python = Path(os.environ.get("TRIPOSR_PYTHON", ""))
    return (repo / "run.py").is_file() and python.is_file()


def huggingface_config():
    endpoint = os.environ.get("THREE_D_HF_ENDPOINT_URL", "").strip().rstrip("/")
    token = (os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN") or "").strip()
    if not endpoint and not token:
        return {"configured": False, "endpoint": "", "token": ""}
    if not endpoint.startswith("https://") or not token:
        return {"configured": False, "endpoint": endpoint, "token": token, "error": "Hugging Face image-to-mesh needs an https endpoint and a token."}
    host = urllib.parse.urlsplit(endpoint).hostname or ""
    if host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local"):
        return {"configured": False, "endpoint": endpoint, "token": token, "error": "Hugging Face endpoint must be a public https host."}
    return {"configured": True, "endpoint": endpoint, "token": token}


def health_payload():
    hf = huggingface_config()
    tripo = triposr_ready()
    ready = bool(TOKEN) and len(TOKEN) >= 24 and (tripo or hf["configured"]) and PUBLIC_URL.startswith("https://")
    error = None
    if not TOKEN or len(TOKEN) < 24:
        error = "MESH_WORKER_TOKEN must be at least 24 characters."
    elif not PUBLIC_URL.startswith("https://"):
        error = "MESH_PUBLIC_URL must be the worker's public https origin."
    elif not tripo and not hf["configured"]:
        error = hf.get("error") or "TripoSR is not installed and the Hugging Face lane is unset."
    return {
        "ready": ready,
        "provider": "blackstar-image-to-mesh",
        "workflows": ["image-to-mesh"] if ready else [],
        "formats": list(FORMATS) if ready else [],
        "engines": {"triposr": tripo, "huggingface": hf["configured"]},
        "error": error,
    }


def public_image_url(value):
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("An https image URL is required.")
    host = parsed.hostname.lower()
    if host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local"):
        raise ValueError("Private or local image URLs are not accepted.")
    if ALLOWED_HOSTS and host not in ALLOWED_HOSTS:
        raise ValueError("Image hostname is not on the worker allowlist.")
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("Image hostname could not be resolved.") from exc
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("The image URL resolves to a private or reserved network address.")
    return parsed.geturl()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError("Image URL redirects are not allowed.")


def download_image(url, destination):
    public_image_url(url)
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": "BlackstarImageToMesh/1.0"})
    with opener.open(request, timeout=30) as response:
        media = response.headers.get("Content-Type", "").split(";")[0].lower()
        if media not in {"image/png", "image/jpeg", "image/webp"}:
            raise ValueError("Source URL did not return a PNG, JPEG or WebP image.")
        received = 0
        with destination.open("wb") as handle:
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                received += len(chunk)
                if received > MAX_IMAGE:
                    raise ValueError("Source image exceeds 16 MB.")
        if received < 32:
            raise ValueError("Source image was empty.")


def run_triposr(image, output, output_format):
    script = str(Path(__file__).with_name("run_triposr.py"))
    python = os.environ["TRIPOSR_PYTHON"]
    subprocess.run(
        [python, script, "--image", str(image), "--output", str(output), "--format", output_format, "--repo", os.environ["TRIPOSR_REPO"]],
        timeout=JOB_TIMEOUT, check=True, cwd=str(output.parent),
    )


def run_huggingface(image_url, output_format, destination):
    config = huggingface_config()
    if not config["configured"]:
        raise RuntimeError(config.get("error") or "Hugging Face image-to-mesh is not configured.")
    body = json.dumps({"image_url": image_url, "output_format": output_format}).encode()
    request = urllib.request.Request(
        config["endpoint"], data=body, method="POST",
        headers={"Authorization": "Bearer " + config["token"], "Content-Type": "application/json", "Accept": "application/json, model/gltf-binary, application/octet-stream"},
    )
    with urllib.request.urlopen(request, timeout=JOB_TIMEOUT) as response:
        media = response.headers.get("Content-Type", "").split(";")[0].lower()
        payload = response.read(MAX_MODEL + 1)
    if len(payload) > MAX_MODEL:
        raise RuntimeError("Hugging Face response exceeded 40 MB.")
    if "json" in media or payload[:1] in (b"{", b"["):
        parsed = json.loads(payload.decode())
        output_url = parsed.get("output_url") or parsed.get("url")
        if parsed.get("error"):
            raise RuntimeError(str(parsed["error"])[:300])
        if isinstance(output_url, str) and output_url.startswith("https://"):
            return output_url
        raise RuntimeError("Hugging Face JSON did not include an https output_url.")
    if len(payload) < 128:
        raise RuntimeError("Hugging Face returned an empty model.")
    destination.write_bytes(payload)
    return None


def split_glb(payload):
    if len(payload) < 20 or payload[:4] != b"glTF":
        raise ValueError("Mesh is not a GLB file, so it cannot be exported as glTF.")
    version = int.from_bytes(payload[4:8], "little")
    length = int.from_bytes(payload[8:12], "little")
    if version != 2 or length != len(payload):
        raise ValueError("GLB header does not match the file.")
    offset = 12
    json_chunk = None
    bin_chunk = b""
    while offset + 8 <= len(payload):
        chunk_len = int.from_bytes(payload[offset:offset + 4], "little")
        chunk_type = payload[offset + 4:offset + 8]
        offset += 8
        chunk = payload[offset:offset + chunk_len]
        offset += chunk_len
        if chunk_type == b"JSON":
            json_chunk = chunk.rstrip(b" \x00")
        elif chunk_type == b"BIN\x00":
            bin_chunk = chunk
    if json_chunk is None:
        raise ValueError("GLB did not contain a JSON chunk.")
    document = json.loads(json_chunk)
    buffers = document.get("buffers")
    if isinstance(buffers, list) and buffers:
        buffers[0]["uri"] = "model.bin"
        buffers[0]["byteLength"] = len(bin_chunk)
    return json.dumps(document, separators=(",", ":")).encode(), bin_chunk


def publish_mesh(folder, output_format, raw):
    if len(raw) < 128:
        raise RuntimeError("The model lane did not write a usable mesh.")
    if output_format == "obj":
        if b"\nv " not in raw[:4000] and not raw.lstrip().startswith(b"v "):
            raise RuntimeError("OBJ export was not a Wavefront mesh.")
        (folder / "model.obj").write_bytes(raw)
        return "model.obj"
    if raw[:4] == b"glTF":
        if output_format == "gltf":
            gltf, bin_bytes = split_glb(raw)
            (folder / "model.gltf").write_bytes(gltf)
            (folder / "model.bin").write_bytes(bin_bytes)
            (folder / "model.glb").write_bytes(raw)
            return "model.gltf"
        (folder / "model.glb").write_bytes(raw)
        return "model.glb"
    if raw[:1] in (b"{", b"["):
        parsed = json.loads(raw)
        if not isinstance(parsed, dict) or "asset" not in parsed:
            raise RuntimeError("JSON export was not a glTF document.")
        (folder / "model.gltf").write_bytes(raw)
        return "model.gltf"
    raise RuntimeError("The model lane did not return a GLB, glTF or OBJ mesh.")


def download_public_bytes(url):
    public_image_url(url)
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": "BlackstarImageToMesh/1.0"})
    with opener.open(request, timeout=60) as response:
        payload = response.read(MAX_MODEL + 1)
    if len(payload) > MAX_MODEL or len(payload) < 128:
        raise RuntimeError("Remote mesh was an unusable size.")
    return payload


def execute(job_id, image_url, output_format):
    with SEMAPHORE:
        folder = OUTPUTS / job_id
        folder.mkdir(parents=True, exist_ok=True)
        update_job(job_id, status="running")
        engine_format = "glb" if output_format == "gltf" else output_format
        output = folder / f"model.{engine_format}"
        try:
            remote_url = None
            if triposr_ready():
                image = folder / "source.png"
                download_image(image_url, image)
                run_triposr(image, output, engine_format)
            else:
                remote_url = run_huggingface(image_url, engine_format, output)
            if remote_url and output_format != "gltf":
                update_job(job_id, status="completed", output_url=remote_url, error=None)
                return
            raw = download_public_bytes(remote_url) if remote_url else (output.read_bytes() if output.is_file() else b"")
            filename = publish_mesh(folder, output_format, raw)
            if not PUBLIC_URL.startswith("https://"):
                raise RuntimeError("MESH_PUBLIC_URL must be https before a mesh can be published.")
            update_job(job_id, status="completed", output_url=f"{PUBLIC_URL}/outputs/{job_id}/{filename}", error=None)
        except subprocess.TimeoutExpired:
            update_job(job_id, status="failed", error="Image-to-mesh exceeded the configured runtime limit.")
        except (ValueError, RuntimeError, urllib.error.URLError, json.JSONDecodeError) as exc:
            update_job(job_id, status="failed", error=str(exc)[:300])
        except Exception:
            update_job(job_id, status="failed", error="Image-to-mesh failed before a mesh was written.")


def job_json(job):
    return {
        "id": job["id"],
        "status": job["status"],
        "output_url": job["output_url"],
        "preview_url": job["preview_url"],
        "error": job["error"],
        "output_format": job["format"],
    }


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
        expected = "Bearer " + TOKEN
        supplied = self.headers.get("Authorization", "")
        if not TOKEN or not hmac.compare_digest(supplied, expected):
            self.reply(401, {"error": "Worker authentication is required."})
            return False
        return True

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == "/health":
            return self.reply(200, health_payload())
        if path.startswith("/outputs/"):
            parts = path.strip("/").split("/")
            if len(parts) != 3 or parts[0] != "outputs" or not _uuid(parts[1]) or parts[2] not in ("model.glb", "model.obj", "model.gltf", "model.bin"):
                return self.reply(404, {"error": "Output not found."})
            job = get_job(parts[1])
            file = OUTPUTS / parts[1] / parts[2]
            if not job or job["status"] != "completed" or not file.is_file() or file.stat().st_size < 12:
                return self.reply(404, {"error": "Output not found."})
            media = {
                "model.glb": "model/gltf-binary",
                "model.gltf": "model/gltf+json",
                "model.bin": "application/octet-stream",
                "model.obj": "model/obj",
            }[parts[2]]
            self.send_response(200)
            self.send_header("Content-Type", media)
            self.send_header("Content-Length", str(file.stat().st_size))
            self.send_header("Access-Control-Allow-Origin", os.environ.get("MESH_ASSET_CORS_ORIGIN", "https://palladium-ai-os.vercel.app"))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            with file.open("rb") as handle:
                shutil.copyfileobj(handle, self.wfile)
            return
        if not self.authorized():
            return
        if path.startswith("/workflow-runs/"):
            job_id = path.removeprefix("/workflow-runs/")
            job = get_job(job_id) if _uuid(job_id) else None
            return self.reply(200, job_json(job)) if job else self.reply(404, {"error": "Job not found."})
        return self.reply(404, {"error": "Unknown endpoint."})

    def do_POST(self):
        if urllib.parse.urlsplit(self.path).path != "/workflow-runs/from-image":
            return self.reply(404, {"error": "Unknown endpoint."})
        if not self.authorized():
            return
        report = health_payload()
        if not report["ready"]:
            return self.reply(503, {"error": report["error"] or "Image-to-mesh worker is not ready."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 12000:
                return self.reply(413, {"error": "Invalid generation request size."})
            data = json.loads(self.rfile.read(size))
            image_url = data.get("image_url")
            output_format = str(data.get("output_format") or "glb").lower()
            if not isinstance(image_url, str):
                return self.reply(422, {"error": "image_url is required."})
            if output_format not in FORMATS:
                return self.reply(422, {"error": "Only glb, gltf and obj output are supported by this worker."})
            public_image_url(image_url)
            with DB_LOCK, sqlite3.connect(DB) as connection:
                active = connection.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0]
                if active >= 2:
                    return self.reply(429, {"error": "Worker queue capacity reached."})
                job_id = str(uuid.uuid4())
                now = int(time.time())
                connection.execute(
                    "INSERT INTO jobs (id,status,format,created_at,updated_at) VALUES (?,?,?,?,?)",
                    (job_id, "queued", output_format, now, now),
                )
                connection.commit()
            threading.Thread(target=execute, args=(job_id, image_url, output_format), daemon=True).start()
            return self.reply(202, {"id": job_id, "status": "queued", "output_format": output_format})
        except (ValueError, TypeError, json.JSONDecodeError):
            return self.reply(422, {"error": "Invalid request or disallowed source URL."})

    def log_message(self, format, *args):
        return


def _uuid(value):
    try:
        return str(uuid.UUID(value)) == value
    except (ValueError, AttributeError, TypeError):
        return False


if __name__ == "__main__":
    init_db()
    bind = os.environ.get("MESH_BIND", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    print(json.dumps(health_payload()), flush=True)
    ThreadingHTTPServer((bind, port), Handler).serve_forever()
