import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import { encodeVox, inspectVox, mergeVoxModels, type VoxelMergeInput, type VoxelModel } from "./vox-codec";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function modelFrom(value: unknown): VoxelModel {
  const input = record(value);
  const size = record(input["size"]);
  return {
    size: { x: Number(size["x"]), y: Number(size["y"]), z: Number(size["z"]) },
    voxels: Array.isArray(input["voxels"]) ? input["voxels"].map((item) => {
      const voxel = record(item);
      return { x: Number(voxel["x"]), y: Number(voxel["y"]), z: Number(voxel["z"]), color: Number(voxel["color"]) };
    }) : [],
    ...(Array.isArray(input["palette"]) ? { palette: input["palette"].map(Number) } : {}),
  };
}

export const VOXEL_STUDIO_TOOL_DEF: ToolDef = {
  name: "voxel_studio",
  description:
    "Create, inspect and merge bounded MagicaVoxel .vox assets for game/app workflows. Uses PalladiumAI's existing agent tool policy and accepts structured JSON/base64 only; it never reads arbitrary server paths or starts a separate MCP runtime.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["create", "inspect", "merge"] },
      filename: { type: "string", description: "Suggested .vox filename for generated output." },
      model: {
        type: "object",
        description: "For create: {size:{x,y,z}, voxels:[{x,y,z,color}], optional palette:[uint32 RGBA]}. Axes are limited to 256 and total voxels to 100000.",
      },
      vox_base64: { type: "string", description: "For inspect: base64-encoded MagicaVoxel VOX bytes, maximum 4 MiB decoded." },
      models: {
        type: "array",
        description: "For merge: up to 16 items shaped as {vox_base64, offset?:{x,y,z}}. Later voxels replace earlier voxels at the same coordinate.",
        items: { type: "object" },
      },
    },
    required: ["action"],
  },
};

function safeFilename(value: unknown): string {
  const candidate = typeof value === "string" ? value.trim() : "model.vox";
  const basename = candidate.split(/[\\/]/).pop() || "model.vox";
  const cleaned = basename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) || "model.vox";
  return cleaned.toLowerCase().endsWith(".vox") ? cleaned : `${cleaned}.vox`;
}

function output(buffer: Buffer, filename: unknown) {
  return {
    filename: safeFilename(filename),
    mime_type: "application/octet-stream",
    encoding: "base64",
    bytes: buffer.length,
    vox_base64: buffer.toString("base64"),
  };
}

export async function runVoxelStudioTool(input: Record<string, unknown>): Promise<unknown> {
  const action = typeof input["action"] === "string" ? input["action"] : "";
  if (action === "create") {
    const buffer = encodeVox(modelFrom(input["model"]));
    return { asset: output(buffer, input["filename"]), inspection: inspectVox(buffer.toString("base64")) };
  }
  if (action === "inspect") {
    const voxBase64 = typeof input["vox_base64"] === "string" ? input["vox_base64"] : "";
    return { inspection: inspectVox(voxBase64) };
  }
  if (action === "merge") {
    const models: VoxelMergeInput[] = Array.isArray(input["models"])
      ? input["models"].map((item) => {
          const value = record(item);
          const offset = record(value["offset"]);
          return {
            voxBase64: typeof value["vox_base64"] === "string" ? value["vox_base64"] : "",
            offset: { x: Number(offset["x"] ?? 0), y: Number(offset["y"] ?? 0), z: Number(offset["z"] ?? 0) },
          };
        })
      : [];
    const merged = mergeVoxModels(models);
    const buffer = encodeVox(merged);
    return { asset: output(buffer, input["filename"] ?? "merged.vox"), inspection: inspectVox(buffer.toString("base64")) };
  }
  return { error: "action must be create, inspect or merge." };
}
