"""Run an installed TripoSR checkout and write one OBJ or GLB file.

This script does not download weights by itself. TripoSR's own run.py does that
on first use when the repo and torch are installed. A missing dependency is a
failure, not a substitute mesh.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--format", choices=("glb", "obj"), required=True)
    parser.add_argument("--repo", required=True)
    args = parser.parse_args()
    repo = Path(args.repo)
    runner = repo / "run.py"
    if not runner.is_file():
        raise SystemExit("TripoSR run.py is not installed.")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    work = output.parent / "triposr"
    work.mkdir(exist_ok=True)
    subprocess.run(
        [sys.executable, str(runner), args.image, "--output-dir", str(work)],
        cwd=str(repo), check=True, timeout=int(__import__("os").environ.get("MESH_JOB_TIMEOUT", "900")),
    )
    produced = next(work.rglob("*.obj"), None)
    if produced is None:
        raise SystemExit("TripoSR did not write an OBJ mesh.")
    if args.format == "obj":
        output.write_bytes(produced.read_bytes())
        return
    try:
        import trimesh
    except ImportError as exc:
        raise SystemExit("trimesh is required to convert TripoSR OBJ output to GLB.") from exc
    scene = trimesh.load(produced, force="mesh")
    scene.export(output)


if __name__ == "__main__":
    main()
