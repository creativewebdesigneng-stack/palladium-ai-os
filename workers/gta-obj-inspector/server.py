"""Bounded, authenticated OBJ geometry inspector for Blackstar Game Foundry.

Runs as a separate Python service; no third-party packages required.
OBJ names provide *hints*, not proof of functional GTA V rigs/collisions.
"""
import datetime
import ipaddress
import json
import os
import re
import secrets
import socket
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BYTES = 25 * 1024 * 1024
MAX_REQUEST = 8192
NAME = re.compile(r"^(?:o|g)\s+(.+)$", re.M)
MATERIAL = re.compile(r"^usemtl\s+(.+)$", re.M)
FACE = re.compile(r"^f\s+(.+)$", re.M)
VERTEX = re.compile(r"^v\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)", re.M)
LOD = re.compile(r"(?:^|[_ .-])lod[_ .-]?(\d+)(?:$|[_ .-])", re.I)
WHEEL = re.compile(r"(?:wheel|tyre|tire)[_ .-]?(?:lf|rf|lr|rr|fl|fr|rl|rr|front|rear|[0-9])", re.I)
COLLISION = re.compile(r"(?:collision|collider|chassis_col|bounds|_col(?:$|[_ .-]))", re.I)


def approved_source(url):
    parsed = urllib.parse.urlsplit(url)
    allowed = {x.strip().lower() for x in os.environ.get("GTA_INSPECTOR_ALLOWED_HOSTS", "").split(",") if x.strip()}
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("HTTPS source without embedded credentials required")
    if parsed.hostname.lower() not in allowed:
        raise ValueError("Source hostname not on inspection allowlist")
    if not parsed.path.lower().endswith(".obj"):
        raise ValueError("Only OBJ inspection is implemented")
    # Reject literal IPs and hostnames resolving to private/link-local/reserved addresses.
    for item in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM):
        addr = ipaddress.ip_address(item[4][0])
        if not addr.is_global:
            raise ValueError("Non-public source address refused")
    return url


def parse_obj(raw):
    source = raw.decode("utf-8-sig", errors="replace")
    names = list(dict.fromkeys(x.strip()[:100] for x in NAME.findall(source) if x.strip()))[:300]
    materials = set(MATERIAL.findall(source))
    vertex_count = len(VERTEX.findall(source))
    faces = FACE.findall(source)
    if not vertex_count or not faces:
        raise ValueError("OBJ has no usable vertices or faces")
    # Check indices are valid without loading large geometry into memory.
    for face in faces:
        parts = face.split()
        if len(parts) < 3:
            raise ValueError("OBJ contains an invalid face")
        for part in parts:
            index = int(part.split("/")[0])
            if index == 0 or abs(index) > vertex_count:
                raise ValueError("OBJ face references invalid vertex")
    lods = {int(n) for name in names for n in LOD.findall(name)}
    return {
        "meshNames": names or ["unnamed_mesh"],
        "materialCount": min(len(materials), 200),
        "textureCount": 0,  # OBJ mtllib references are not verified textures.
        "lodCount": min(len(lods), 8),
        "collisionMeshDetected": any(COLLISION.search(name) for name in names),
        "wheelRigDetected": any(WHEEL.search(name) for name in names),
    }


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/v1/gta/inspect":
            return self.send_error(404)
        expected = os.environ.get("GTA_INSPECTOR_TOKEN", "")
        token = self.headers.get("Authorization", "").removeprefix("Bearer ")
        if not expected or not secrets.compare_digest(token, expected):
            return self.send_error(401)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > MAX_REQUEST:
                raise ValueError("Invalid request size")
            body = json.loads(self.rfile.read(length))
            asset_id = str(uuid.UUID(body["asset_id"]))
            url = approved_source(body["output_url"])
            if body["category"] not in ("car", "motorcycle", "truck", "prop"):
                raise ValueError("Invalid category")
            opener = urllib.request.build_opener(urllib.request.HTTPSHandler())
            # Disable redirects: never follow a source to an unapproved host.
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, req, fp, code, msg, headers, newurl):
                    raise ValueError("Redirects are not permitted")
            opener.add_handler(NoRedirect())
            # Host allowlisting is necessary but not sufficient against DNS rebinding.\n            # Deploy with an egress firewall that denies private/reserved networks.\n            with opener.open(urllib.request.Request(url, headers={"Accept": "text/plain"}), timeout=15) as stream:
                raw = stream.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("OBJ exceeds 25 MB inspection limit")
            observed = parse_obj(raw)
            report = {
                "assetId": asset_id,
                "inspectedOutputUrl": url,
                "inspector": {
                    "provider": "blackstar-obj-inspector",
                    "jobId": str(uuid.uuid4()),
                    "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                },
                "observed": observed,
                "nativeFilesGenerated": False,
            }
            payload = json.dumps(report).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except (ValueError, KeyError, TypeError, UnicodeError, json.JSONDecodeError) as exc:
            self.send_error(422, str(exc))
        except Exception:
            self.send_error(502, "Inspection source unavailable")


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), Handler).serve_forever()
