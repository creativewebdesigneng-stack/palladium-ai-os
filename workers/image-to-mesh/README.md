# Blackstar image-to-mesh worker

This service is the worker 3D Studio already calls:

- `GET /health` returns JSON. `ready` is true only when a real lane can run.
- `POST /workflow-runs/from-image` with `{ "image_url", "output_format" }` queues a job.
- `GET /workflow-runs/<id>` returns `status`, `output_url`, `preview_url` and `error`.
- Finished files are served at `/outputs/<id>/model.glb`, `model.obj`, or `model.gltf` plus `model.bin`. A glTF export is a split of the GLB the model lane actually wrote.

There are two lanes. Neither one invents a mesh.

1. **TripoSR** (MIT, https://github.com/VAST-AI-Research/TripoSR) when `TRIPOSR_REPO` and `TRIPOSR_PYTHON` point at an installed checkout.
2. **Hugging Face** when `THREE_D_HF_ENDPOINT_URL` and `HF_TOKEN` are set. The endpoint must accept `POST` JSON `{ "image_url", "output_format" }` and return either JSON `{ "output_url": "https://..." }` or the GLB/OBJ bytes. `GET <endpoint>/jobs/<id>` must return the same JSON shape if the job is queued.

If neither lane is configured, `/health` is HTTP 200 with `"ready": false` and generation returns HTTP 503.

## Render

`render.yaml` adds a Docker web service named `blackstar-image-to-mesh` next to the existing browser worker. The starter plan can cost money. Skip it if you only want the Vercel-side Hugging Face fallback described below.

1. In Render, open the existing Blueprint for this repository, or create one. Render asks for the new secrets. Do not commit them.
2. Set `MESH_WORKER_TOKEN` to a random string of at least 24 characters.
3. After the first deploy, copy the service URL (`https://....onrender.com`) into `MESH_PUBLIC_URL` and redeploy. The worker will not publish a file URL until this is https.
4. Choose one lane:
   - Hugging Face: set `THREE_D_HF_ENDPOINT_URL` and `HF_TOKEN` on the Render service. The slim Docker image can then report `ready: true` without a GPU.
   - TripoSR: build and deploy `Dockerfile.gpu` on a machine with enough RAM (about 6 GB). CPU PyTorch is installed by that image; a CUDA host should swap in the matching PyTorch wheel. Set `TRIPOSR_REPO=/opt/TripoSR` and `TRIPOSR_PYTHON=/usr/local/bin/python`.
5. Optional: set `MESH_ALLOWED_IMAGE_HOSTS` to a comma-separated host list. When it is empty, any public https image host is accepted and private addresses are still rejected.

Then set the same values on Vercel and redeploy Blackstar:

```text
MESH_WORKER_URL=https://your-service.onrender.com
MESH_WORKER_TOKEN=<the same token>
```

`MODLY_API_URL` and `MODLY_API_TOKEN` still override the old hosted route when `MESH_WORKER_URL` is unset.

## Hugging Face without this worker

Blackstar can call the endpoint itself when the mesh worker is down or unset. On Vercel only:

```text
THREE_D_HF_ENDPOINT_URL=https://your-endpoint.endpoints.huggingface.cloud/...
HF_TOKEN=<token from huggingface.co/settings/tokens>
```

Leave both unset and this lane stays off. The endpoint contract is the same JSON contract as above. A binary GLB response is stored in the private `three-d-studio` bucket for the signed-in user.

## Local run

```sh
export MESH_WORKER_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
export MESH_PUBLIC_URL=https://your-https-host.example
export THREE_D_HF_ENDPOINT_URL=https://your-endpoint.example
export HF_TOKEN=hf_...
python3 workers/image-to-mesh/server.py
```

`GET /health` is public. Job routes require `Authorization: Bearer $MESH_WORKER_TOKEN`.
