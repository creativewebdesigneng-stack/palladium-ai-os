"""Blackstar cinema assembly worker.

Speaks the Cinema Studio master contract:
  GET  /health
  POST /v1/films/assemble
  POST /v1/films          (assembly only when segment URLs are present)
  GET  /v1/films/<id>
  GET  /outputs/<id>/master.mp4

ffmpeg concatenates completed shot videos into one MP4. A text prompt never
becomes a video. Health is ready only when ffmpeg runs and the public origin
and token are set.
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

ROOT = Path(os.environ.get("CINEMA_DATA_DIR", "./cinema-data")).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
OUTPUTS = ROOT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
DB = ROOT / "jobs.sqlite3"
TOKEN = os.environ.get("CINEMA_WORKER_TOKEN", "").strip()
PUBLIC_URL = os.environ.get("CINEMA_PUBLIC_URL", "").rstrip("/")
ALLOWED_HOSTS = {host.strip().lower() for host in os.environ.get("CINEMA_ALLOWED_MEDIA_HOSTS", "").split(",") if host.strip()}
JOB_TIMEOUT = int(os.environ.get("CINEMA_JOB_TIMEOUT", "900"))
MAX_SEGMENT = 80 * 1024 * 1024
MAX_SEGMENTS = 48
DB_LOCK = threading.Lock()
SEMAPHORE = threading.Semaphore(1)
ASPECTS = {
    "16:9": (1280, 720),
    "2.39:1": (1434, 600),
    "1.85:1": (1280, 692),
    "9:16": (720, 1280),
    "1:1": (960, 960),
}


def init_db():
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS jobs
            (id TEXT PRIMARY KEY, status TEXT NOT NULL, output_url TEXT, error TEXT,
             created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)""")
        connection.execute("UPDATE jobs SET status='failed', error='Worker restarted before completion.' WHERE status IN ('queued','running')")
        connection.commit()


def get_job(job_id):
    with DB_LOCK, sqlite3.connect(DB) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        return dict(row) if row else None


def update_job(job_id, **values):
    allowed = {"status", "output_url", "error"}
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


def ffmpeg_version():
    binary = shutil.which("ffmpeg")
    probe = shutil.which("ffprobe")
    if not binary or not probe:
        return None
    try:
        proc = subprocess.run([binary, "-version"], capture_output=True, text=True, timeout=5, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0:
        return None
    line = (proc.stdout or "").splitlines()
    return line[0][:160] if line else None


def health_payload():
    version = ffmpeg_version()
    token_ok = len(TOKEN) >= 24
    public_ok = PUBLIC_URL.startswith("https://")
    ready = bool(version) and token_ok and public_ok
    error = None
    if not version:
        error = "ffmpeg is not installed on this worker."
    elif not token_ok:
        error = "CINEMA_WORKER_TOKEN must be at least 24 characters."
    elif not public_ok:
        error = "CINEMA_PUBLIC_URL must be the worker's public https origin."
    return {
        "ready": ready,
        "ffmpeg": bool(version),
        "ffmpeg_version": version,
        "provider": "blackstar-cinema-render",
        "workflows": ["segment-assembly"] if ready else [],
        "outputs": ["mp4"] if ready else [],
        "error": error,
        "cinema": {"textToFilm": False, "assembly": bool(version), "inventsFrames": False},
    }


def public_media_url(value):
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("An https video URL is required.")
    host = parsed.hostname.lower()
    if host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local"):
        raise ValueError("Private or local video URLs are not accepted.")
    if ALLOWED_HOSTS and host not in ALLOWED_HOSTS:
        raise ValueError("Video hostname is not on the worker allowlist.")
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("Video hostname could not be resolved.") from exc
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("The video URL resolves to a private or reserved network address.")
    return parsed.geturl()


def segment_urls(data):
    urls = []
    manifest = data.get("manifest") if isinstance(data, dict) else None
    timeline = manifest.get("timeline") if isinstance(manifest, dict) else None
    if isinstance(timeline, list):
        for item in timeline:
            if isinstance(item, dict) and isinstance(item.get("videoUrl"), str):
                urls.append(item["videoUrl"])
    segments = data.get("segments") if isinstance(data, dict) else None
    if isinstance(segments, list):
        for item in segments:
            if isinstance(item, str):
                urls.append(item)
            elif isinstance(item, dict) and isinstance(item.get("url"), str):
                urls.append(item["url"])
    if len(urls) > MAX_SEGMENTS:
        raise ValueError(f"Assembly accepts at most {MAX_SEGMENTS} segments.")
    return urls


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError("Video URL redirects are not allowed.")


def download_segment(url, destination):
    public_media_url(url)
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": "BlackstarCinemaRender/1.0"})
    with opener.open(request, timeout=60) as response:
        media = response.headers.get("Content-Type", "").split(";")[0].lower()
        if media.startswith("text/") or media in {"text/html", "application/json", "image/png", "image/jpeg"}:
            raise ValueError("Segment URL did not return a video.")
        received = 0
        with destination.open("wb") as handle:
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                received += len(chunk)
                if received > MAX_SEGMENT:
                    raise ValueError("A segment exceeds 80 MB.")
        if received < 128:
            raise ValueError("A segment was empty.")


def assert_video(path):
    probe = shutil.which("ffprobe")
    if not probe:
        raise RuntimeError("ffprobe is not installed.")
    proc = subprocess.run(
        [probe, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, timeout=30, check=False,
    )
    if proc.returncode != 0 or "video" not in (proc.stdout or ""):
        raise RuntimeError("A downloaded segment is not a video file.")


def compose(paths, destination, aspect):
    binary = shutil.which("ffmpeg")
    if not binary:
        raise RuntimeError("ffmpeg is not installed.")
    width, height = ASPECTS.get(aspect, ASPECTS["16:9"])
    width -= width % 2
    height -= height % 2
    listing = destination.parent / "concat.txt"
    lines = []
    for path in paths:
        escaped = str(path).replace("'", "'\\''")
        lines.append(f"file '{escaped}'\n")
    listing.write_text("".join(lines), encoding="utf-8")
    proc = subprocess.run(
        [
            binary, "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-c:a", "aac", "-movflags", "+faststart",
            str(destination),
        ],
        capture_output=True, text=True, timeout=JOB_TIMEOUT, check=False,
    )
    if proc.returncode != 0 or not destination.is_file() or destination.stat().st_size < 128:
        detail = (proc.stderr or "ffmpeg produced no file.").strip().splitlines()
        raise RuntimeError("ffmpeg assembly failed. " + (detail[-1][:220] if detail else ""))


def execute(job_id, urls, aspect):
    with SEMAPHORE:
        folder = OUTPUTS / job_id
        folder.mkdir(parents=True, exist_ok=True)
        update_job(job_id, status="running")
        output = folder / "master.mp4"
        try:
            local = []
            for index, url in enumerate(urls):
                segment = folder / f"segment-{index:03d}.mp4"
                download_segment(url, segment)
                assert_video(segment)
                local.append(segment)
            compose(local, output, aspect)
            if not PUBLIC_URL.startswith("https://"):
                raise RuntimeError("CINEMA_PUBLIC_URL must be https before a master can be published.")
            update_job(job_id, status="completed", output_url=f"{PUBLIC_URL}/outputs/{job_id}/master.mp4", error=None)
        except subprocess.TimeoutExpired:
            update_job(job_id, status="failed", error="Assembly exceeded the configured runtime limit.")
        except (ValueError, RuntimeError, urllib.error.URLError, json.JSONDecodeError) as exc:
            update_job(job_id, status="failed", error=str(exc)[:300])
        except Exception:
            update_job(job_id, status="failed", error="Assembly failed before a master file was written.")


def job_json(job):
    return {
        "id": job["id"],
        "status": job["status"],
        "output_url": job["output_url"],
        "error": job["error"],
        "stage": "master",
        "metadata": {"provider": "blackstar-cinema-render"},
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

    def queue_assembly(self, data):
        report = health_payload()
        if not report["ready"]:
            return self.reply(503, {"error": report["error"] or "Cinema assembly worker is not ready."})
        try:
            urls = segment_urls(data)
        except ValueError as exc:
            return self.reply(422, {"error": str(exc)})
        if not urls:
            return self.reply(422, {
                "error": "This worker does not generate video from a text prompt. POST /v1/films/assemble with completed segment URLs. Configure FAL_KEY or LTX_WORKER_URL on Blackstar for generation.",
            })
        try:
            for url in urls:
                public_media_url(url)
        except ValueError as exc:
            return self.reply(422, {"error": str(exc)})
        aspect = str(data.get("aspect_ratio") or "16:9")
        if aspect not in ASPECTS:
            aspect = "16:9"
        with DB_LOCK, sqlite3.connect(DB) as connection:
            active = connection.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0]
            if active >= 2:
                return self.reply(429, {"error": "Worker queue capacity reached."})
            job_id = str(uuid.uuid4())
            now = int(time.time())
            connection.execute(
                "INSERT INTO jobs (id,status,created_at,updated_at) VALUES (?,?,?,?)",
                (job_id, "queued", now, now),
            )
            connection.commit()
        threading.Thread(target=execute, args=(job_id, urls, aspect), daemon=True).start()
        return self.reply(202, {"id": job_id, "status": "queued", "stage": "master"})

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == "/health":
            return self.reply(200, health_payload())
        if path.startswith("/outputs/"):
            parts = path.strip("/").split("/")
            if len(parts) != 3 or parts[0] != "outputs" or not _uuid(parts[1]) or parts[2] != "master.mp4":
                return self.reply(404, {"error": "Output not found."})
            job = get_job(parts[1])
            file = OUTPUTS / parts[1] / "master.mp4"
            if not job or job["status"] != "completed" or not file.is_file() or file.stat().st_size < 128:
                return self.reply(404, {"error": "Output not found."})
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(file.stat().st_size))
            self.send_header("Access-Control-Allow-Origin", os.environ.get("CINEMA_ASSET_CORS_ORIGIN", "https://palladium-ai-os.vercel.app"))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            with file.open("rb") as handle:
                shutil.copyfileobj(handle, self.wfile)
            return
        if not self.authorized():
            return
        if path.startswith("/v1/films/"):
            job_id = path.removeprefix("/v1/films/")
            job = get_job(job_id) if _uuid(job_id) else None
            return self.reply(200, job_json(job)) if job else self.reply(404, {"error": "Job not found."})
        return self.reply(404, {"error": "Unknown endpoint."})

    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        if path not in {"/v1/films", "/v1/films/assemble"}:
            return self.reply(404, {"error": "Unknown endpoint."})
        if not self.authorized():
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 2_000_000:
                return self.reply(413, {"error": "Invalid assembly request size."})
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                return self.reply(422, {"error": "Assembly request must be a JSON object."})
        except (ValueError, json.JSONDecodeError):
            return self.reply(422, {"error": "Invalid assembly request."})
        return self.queue_assembly(data)

    def log_message(self, format, *args):
        return


def _uuid(value):
    try:
        return str(uuid.UUID(value)) == value
    except (ValueError, AttributeError, TypeError):
        return False


if __name__ == "__main__":
    init_db()
    bind = os.environ.get("CINEMA_BIND", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    print(json.dumps({k: health_payload()[k] for k in ("ready", "ffmpeg", "error", "provider")}), flush=True)
    ThreadingHTTPServer((bind, port), Handler).serve_forever()
