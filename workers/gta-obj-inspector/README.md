# GTA OBJ Inspector — prototype worker

This service **parses actual OBJ file structure** (vertices, faces, object/group names and material usage) and emits an inspection report accepted by Blackstar's existing GTA inspection contract.

## Deploy

Run with Python 3.11+:
```sh
cd workers/gta-obj-inspector
python -m unittest discover -v
PORT=8080 GTA_INSPECTOR_TOKEN=<secret> GTA_INSPECTOR_ALLOWED_HOSTS=assets.example.com python server.py
```

Place behind an HTTPS reverse proxy. Configure the Blackstar server's `GAME_FOUNDRY_GTA_INSPECTOR_URL` and `GAME_FOUNDRY_GTA_INSPECTOR_TOKEN` to match. **Do not expose this unauthenticated.**

**Limitations:** OBJ only, max 25 MB, hostname allowlist, redirects refused. Names matching wheel/collision conventions are only *heuristics*, not verified GTA rigging or collision physics. The report cannot prove GTA V compatibility or generate `.yft`/`.ytd`. FBX requires a separate licensed parser. No service is deployed by this PR. Do not configure production until the service's network isolation and URL fetching are security reviewed.
