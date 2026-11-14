"""Cinema assembly worker tests. No paid provider is called."""
import json
import os
import shutil
import subprocess
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

os.environ["CINEMA_DATA_DIR"] = tempfile.mkdtemp(prefix="cinema-worker-")
os.environ["CINEMA_WORKER_TOKEN"] = "c" * 24
os.environ["CINEMA_PUBLIC_URL"] = "https://cinema.example.com"
os.environ.pop("CINEMA_ALLOWED_MEDIA_HOSTS", None)

import server  # noqa: E402


def tiny_mp4(path: Path):
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=0.2",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
            "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
            str(path),
        ],
        check=True, capture_output=True, timeout=30,
    )


class CinemaRenderWorkerTest(unittest.TestCase):
    def test_health_requires_ffmpeg_token_and_https_origin(self):
        report = server.health_payload()
        self.assertEqual(report["provider"], "blackstar-cinema-render")
        self.assertFalse(report["cinema"]["textToFilm"])
        self.assertFalse(report["cinema"]["inventsFrames"])
        if shutil.which("ffmpeg") and shutil.which("ffprobe"):
            self.assertTrue(report["ready"])
            self.assertTrue(report["ffmpeg"])
        else:
            self.assertFalse(report["ready"])
            self.assertIn("ffmpeg", report["error"])

    def test_prompt_only_render_is_rejected_and_writes_no_file(self):
        server.init_db()
        with server.DB_LOCK, server.sqlite3.connect(server.DB) as connection:
            connection.execute("DELETE FROM jobs")
        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        port = httpd.server_address[1]
        try:
            request = urllib.request.Request(
                f"http://127.0.0.1:{port}/v1/films",
                data=json.dumps({"title": "Untitled", "prompt": "A film that was never shot.", "screenplay": "x" * 120}).encode(),
                headers={"Authorization": "Bearer " + os.environ["CINEMA_WORKER_TOKEN"], "Content-Type": "application/json"},
            )
            with self.assertRaises(urllib.error.HTTPError) as rejected:
                urllib.request.urlopen(request)
            self.assertEqual(rejected.exception.code, 422)
            body = json.loads(rejected.exception.read())
            self.assertIn("does not generate video", body["error"])
            with server.DB_LOCK, server.sqlite3.connect(server.DB) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM jobs").fetchone()[0], 0)
        finally:
            httpd.shutdown()
            httpd.server_close()

    def test_private_segment_urls_are_rejected(self):
        with self.assertRaises(ValueError):
            server.public_media_url("https://127.0.0.1/secret.mp4")
        with self.assertRaises(ValueError):
            server.public_media_url("http://cdn.example.com/clip.mp4")

    def test_assembly_of_real_segments_publishes_a_non_empty_mp4(self):
        if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
            self.skipTest("ffmpeg is not installed")
        folder = Path(server.OUTPUTS) / "fixture"
        folder.mkdir(parents=True, exist_ok=True)
        first = folder / "a.mp4"
        second = folder / "b.mp4"
        tiny_mp4(first)
        tiny_mp4(second)
        destination = folder / "master.mp4"
        server.compose([first, second], destination, "16:9")
        self.assertGreater(destination.stat().st_size, 128)
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(destination)],
            check=True, capture_output=True, text=True,
        )
        self.assertIn("video", probe.stdout)

    def test_missing_ffmpeg_does_not_mark_a_job_completed(self):
        original = server.compose
        def fail(*_args, **_kwargs):
            raise RuntimeError("ffmpeg is not installed.")
        server.compose = fail
        server.init_db()
        job_id = "22222222-2222-4222-8222-222222222222"
        with server.DB_LOCK, server.sqlite3.connect(server.DB) as connection:
            now = 1
            connection.execute("INSERT INTO jobs (id,status,created_at,updated_at) VALUES (?,?,?,?)", (job_id, "queued", now, now))
        try:
            folder = server.OUTPUTS / job_id
            folder.mkdir(parents=True, exist_ok=True)
            segment = folder / "segment-000.mp4"
            if shutil.which("ffmpeg"):
                tiny_mp4(segment)
            else:
                segment.write_bytes(b"\x00" * 256)
            original_download = server.download_segment
            original_assert = server.assert_video
            server.download_segment = lambda _url, destination: destination.write_bytes(segment.read_bytes())
            server.assert_video = lambda _path: None
            server.execute(job_id, ["https://cdn.example.com/a.mp4"], "16:9")
            job = server.get_job(job_id)
            self.assertEqual(job["status"], "failed")
            self.assertIsNone(job["output_url"])
            self.assertFalse((folder / "master.mp4").is_file())
            server.download_segment = original_download
            server.assert_video = original_assert
        finally:
            server.compose = original


if __name__ == "__main__":
    unittest.main()
