# Blackstar no-credit 3D worker — Shap-E + TripoSR + TRELLIS

This is a **real model-execution worker** behind Blackstar's existing `public.three_d_jobs` workflow. The HTTP service itself requires only Python's standard library, but **it does not bundle or install any models or weights**. Model dependencies are separate and often large. No hosted paid generation API is called.

## Three model lanes

| Model | Input | Export | Hardware |
| --- | --- | --- | --- |
| OpenAI Shap-E | Text or image | OBJ, GLB via real mesh conversion | CPU supported but slow; CUDA recommended |
| VAST/Stable TripoSR | Single image | OBJ or GLB | ~6 GB VRAM is typical; CPU slower |
| Microsoft TRELLIS | Text or image | GLB or OBJ via real mesh conversion | Linux/CUDA, **>=16 GB VRAM required** |

- Shap-E: https://github.com/openai/shap-e (MIT)
- TripoSR: https://github.com/VAST-AI-Research/TripoSR (MIT for source and weights)
- TRELLIS: https://github.com/microsoft/TRELLIS (MIT for most code and models; check licenses for bundled submodules)

Do not claim these models are native GTA exporters. OBJ/GLB still need DCC cleanup, vehicle topology, rigging, LODs and a separate authorized GTA V native-export tool.

## Install each model in its own environment

Follow the **official model repositories** for specific PyTorch, CUDA, NumPy and flash-attention versions. Do **not** `pip install` all three into one environment: TRELLIS has specific CUDA/extension requirements.

Example on Linux (adapt paths as needed):

```sh
# 1. Install Shap-E and its requirements (use a separate venv).
git clone https://github.com/openai/shap-e /srv/models/shap-e
/srv/venvs/shap-e/bin/pip install -e /srv/models/shap-e
/srv/venvs/shap-e/bin/pip install trimesh

# 2. Install TripoSR, torch and the requirements in its own venv.
git clone https://github.com/VAST-AI-Research/TripoSR /srv/models/TripoSR
/srv/venvs/triposr/bin/pip install -r /srv/models/TripoSR/requirements.txt

# 3. Install TRELLIS in a compatible Linux/CUDA venv using its official README.
#    In that environment install trimesh for OBJ conversions.
#    The worker will not offer TRELLIS unless VRAM >= 16 GiB.
```

Install appropriate PyTorch in each venv following the upstream instructions. If there is no compatible GPU, leave TRELLIS disabled; Shap-E/TripoSR can be enabled independently.

## Worker configuration

Run this on a machine **you own and control** with sufficient CPU/GPU resources (not Vercel's serverless functions).

```sh
export OPEN3D_WORKER_TOKEN='YOUR_LONG_RANDOM_PRIVATE_TOKEN'
export OPEN3D_PUBLIC_URL='https://your-worker.example.com'
export OPEN3D_ASSET_CORS_ORIGIN='https://palladium-ai-os.vercel.app'
export OPEN3D_ALLOWED_IMAGE_HOSTS='piwhiuangitqvwvwwcga.supabase.co'
export OPEN3D_DATA_DIR='/srv/blackstar-3d-data'
export OPEN3D_BIND='127.0.0.1'
export PORT=8765

export OPEN3D_ENABLE_SHAPE_E=1
export OPEN3D_SHAPE_PYTHON='/srv/venvs/shap-e/bin/python'
export OPEN3D_ENABLE_TRIPOSR=1
export OPEN3D_TRIPOSR_REPO='/srv/models/TripoSR'
export OPEN3D_TRIPOSR_PYTHON='/srv/venvs/triposr/bin/python'
# Enable TRELLIS only after CUDA and model dependencies are installed.
# export OPEN3D_ENABLE_TRELLIS=1
# export OPEN3D_TRELLIS_PYTHON='/srv/venvs/trellis/bin/python'

python3 workers/open3d-free/server.py
```

Place an HTTPS reverse proxy (Caddy, nginx, or authenticated/private tunnel) in front of the worker. **Do not expose plain HTTP publicly.** The job endpoints require a bearer token. Model files have unguessable UUID links and are downloadable without bearer tokens so the Blackstar browser can display/download actual meshes; protect and rotate those links/outputs according to your retention policy.

Set these **Vercel production server-side environment variables**, then redeploy:

- `GAME_FOUNDRY_OPEN3D_URL` = `https://your-worker.example.com`
- `GAME_FOUNDRY_OPEN3D_TOKEN` = exactly the private `OPEN3D_WORKER_TOKEN` from the worker

Neither secret should have a browser/public prefix. Do not paste secrets into chat or commit them to Git. The worker returns live ready models at `GET /v1/health`; Blackstar only routes to ready models and never auto-falls back to FAL.

## Running & testing

Server heartbeat (returns only installed/available engines, not synthetic generation):

```sh
curl -H "Authorization: Bearer $OPEN3D_WORKER_TOKEN" "https://your-worker.example.com/v1/health"
```

Use the Game Foundry UI to choose **Automatic · free models only**, Shap-E, TripoSR or TRELLIS. Prompt + game-ready normally chooses Shap-E, image + game-ready TripoSR, cinematic prefers TRELLIS where GPU is capable. **FAL remains a separately labelled paid opt-in**, never part of automatic fallback.

Submit a real request using the existing `createGameFoundryAsset` server function; it saves the existing `three_d_jobs` row and polls the authenticated worker. The worker's own SQLite DB survives process restarts. Queued/running tasks are marked failed after a hard restart; in-process threads do not survive crashes. It serves outputs only when an actual non-empty OBJ/GLB was written.

### Safety and operational constraints

- The image URL hostname must be explicitly listed in `OPEN3D_ALLOWED_IMAGE_HOSTS`, use HTTPS, and resolve to a public IP; HTTP redirects are disallowed. This protects from common SSRF and intranet requests. Avoid whitelisting arbitrary user-controlled domains.
- Model weights download during initial installation/run and may take significant disk space. Nothing is free about electricity or cloud GPU rental.
- A local host behind NAT needs HTTPS/tunnel access so Vercel can submit authenticated requests and users can download finished files. Treat worker outputs as semi-public links and set retention/cleanup.
- Running TRELLIS on a computer with less than 16GB VRAM will be blocked. Use separate model environments due to CUDA incompatibilities.
- This setup is **not connected to live production until the operator provisions a working host and configures the two Vercel variables**.
