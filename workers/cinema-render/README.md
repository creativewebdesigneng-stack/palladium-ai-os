# Blackstar cinema assembly worker

This service concatenates completed shot videos with ffmpeg. It does not generate pictures or motion from a prompt, and it does not publish a file unless ffmpeg wrote a non-empty MP4.

## Contract

- `GET /health` returns JSON. `ready` is true only when `ffmpeg` and `ffprobe` run, `CINEMA_WORKER_TOKEN` is at least 24 characters, and `CINEMA_PUBLIC_URL` is an https origin.
- `POST /v1/films/assemble` accepts the Cinema Studio manifest (`manifest.timeline[].videoUrl`) or `segments: [{url}]`. It returns `202` with a job id.
- `POST /v1/films` uses the same assembly rules. A prompt with no segment URLs returns `422`.
- `GET /v1/films/<id>` returns `queued`, `running`, `completed` or `failed`. `output_url` is set only after `master.mp4` exists.
- `GET /outputs/<id>/master.mp4` serves that file.

## Deploy

Build `workers/cinema-render/Dockerfile`, or use the `blackstar-cinema-render` service in `render.yaml`. Set:

- `CINEMA_WORKER_TOKEN` — same secret as `CINEMA_STUDIO_WORKER_TOKEN` on the web app
- `CINEMA_PUBLIC_URL` — the service's public https origin, no trailing path
- `CINEMA_ALLOWED_MEDIA_HOSTS` — optional comma-separated host allowlist. Empty allows any public https host. Private addresses are always rejected.

On the web app set `CINEMA_STUDIO_MASTER_WORKER_URL` to that origin and `CINEMA_STUDIO_WORKER_TOKEN` to the same token. Leave `CINEMA_STUDIO_WORKER_URL` unset unless a separate worker really implements text-to-film.

Keyframe and video-segment generation stay on `FAL_KEY` (Seedream and LTX) or `SEEDREAM_WORKER_URL` / `LTX_WORKER_URL`. This process only assembles URLs those lanes already produced.
