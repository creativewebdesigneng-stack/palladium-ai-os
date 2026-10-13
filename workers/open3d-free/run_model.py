"""Actual local Shap-E, TripoSR, or TRELLIS generation.
Model packages and weights must be installed separately; never emits placeholder meshes.
See README.md for independently-licensed upstream dependencies.
"""
import argparse
from pathlib import Path
import subprocess
import sys


def export_mesh(glb_or_obj: Path, output: Path):
    """Real conversion of existing geometry. No dummy scene or pretend exports."""
    if glb_or_obj.suffix == output.suffix:
        if glb_or_obj != output:
            output.write_bytes(glb_or_obj.read_bytes())
        return
    import trimesh
    scene = trimesh.load(str(glb_or_obj), force="scene", process=False)
    if not scene.geometry:
        raise RuntimeError("The generated model has no mesh geometry.")
    if output.suffix == ".obj":
        output.write_text(trimesh.exchange.obj.export_obj(scene, include_texture=True), encoding="utf-8")
    elif output.suffix == ".glb":
        output.write_bytes(scene.export(file_type="glb"))
    else:
        raise ValueError("Unsupported mesh interchange format.")


def shap_e(args):
    import torch
    from shap_e.diffusion.sample import sample_latents
    from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
    from shap_e.models.download import load_model, load_config
    from shap_e.util.notebooks import decode_latent_mesh
    from shap_e.util.image_util import load_image

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    transmitter = load_model("transmitter", device=device)
    model = load_model("image300M" if args.image else "text300M", device=device)
    diffusion = diffusion_from_config(load_config("diffusion"))
    conditioning = {"images": [load_image(args.image)]} if args.image else {"texts": [args.prompt]}
    latents = sample_latents(
        batch_size=1, model=model, diffusion=diffusion,
        guidance_scale=3.0 if args.image else 15.0,
        model_kwargs=conditioning, progress=False, clip_denoised=True,
        use_fp16=device.type == "cuda", use_karras=True, karras_steps=64,
        sigma_min=1e-3, sigma_max=160, s_churn=0,
    )
    mesh = decode_latent_mesh(transmitter, latents[0]).tri_mesh()
    obj = args.output.with_suffix(".obj")
    with obj.open("w", encoding="utf-8") as target:
        mesh.write_obj(target)
    export_mesh(obj, args.output)


def triposr(args):
    if not args.image or not args.triposr_repo:
        raise ValueError("TripoSR requires a downloaded image and installed TripoSR repository.")
    source = Path(args.triposr_repo).resolve() / "run.py"
    if not source.is_file():
        raise RuntimeError("TripoSR run.py is not installed.")
    result_dir = args.output.parent / "triposr-output"
    subprocess.run(
        [sys.executable, str(source), str(args.image), "--output-dir", str(result_dir),
         "--model-save-format", args.format],
        cwd=str(source.parent), check=True,
    )
    generated = result_dir / "0" / ("mesh." + args.format)
    if not generated.is_file():
        raise RuntimeError("TripoSR finished without creating its mesh output.")
    export_mesh(generated, args.output)


def trellis(args):
    import torch
    if not torch.cuda.is_available() or torch.cuda.get_device_properties(0).total_memory < 16 * 1024**3:
        raise RuntimeError("TRELLIS requires a CUDA GPU with at least 16 GB of VRAM.")
    from trellis.pipelines import TrellisImageTo3DPipeline, TrellisTextTo3DPipeline
    from trellis.utils import postprocessing_utils
    if args.image:
        from PIL import Image
        pipeline = TrellisImageTo3DPipeline.from_pretrained("microsoft/TRELLIS-image-large")
        conditioning = Image.open(args.image).convert("RGB")
    else:
        pipeline = TrellisTextTo3DPipeline.from_pretrained("microsoft/TRELLIS-text-xlarge")
        conditioning = args.prompt
    pipeline.cuda()
    outputs = pipeline.run(conditioning, seed=1)
    if not outputs.get("gaussian") or not outputs.get("mesh"):
        raise RuntimeError("TRELLIS did not return the Gaussian and mesh required for a GLB output.")
    mesh = postprocessing_utils.to_glb(
        outputs["gaussian"][0], outputs["mesh"][0], simplify=0.95, texture_size=1024,
    )
    intermediate = args.output.parent / "trellis-mesh.glb"
    mesh.export(str(intermediate))
    export_mesh(intermediate, args.output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--generator", required=True, choices=["shap-e", "triposr", "trellis"])
    parser.add_argument("--format", required=True, choices=["obj", "glb"])
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--prompt", default="")
    parser.add_argument("--image", type=Path)
    parser.add_argument("--triposr-repo", type=Path)
    args = parser.parse_args()
    if args.output.suffix != "." + args.format:
        raise ValueError("Output filename and requested format disagree.")
    if args.generator != "triposr" and not args.image and not args.prompt.strip():
        raise ValueError("Prompt or source image required.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    {"shap-e": shap_e, "triposr": triposr, "trellis": trellis}[args.generator](args)
    if not args.output.is_file() or args.output.stat().st_size < 128:
        raise RuntimeError("Local inference did not produce a real 3D model.")


if __name__ == "__main__":
    main()
