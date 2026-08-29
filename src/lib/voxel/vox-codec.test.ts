import { describe, expect, it } from "vitest";
import { decodeVoxBase64, encodeVox, inspectVox, mergeVoxModels, type VoxelModel } from "./vox-codec";
import { voxelModelToObj } from "./voxel-mesh";

function asBase64(model: VoxelModel): string {
  return encodeVox(model).toString("base64");
}

describe("Voxel Studio codec", () => {
  it("round-trips a bounded VOX model", () => {
    const model: VoxelModel = {
      size: { x: 4, y: 4, z: 4 },
      voxels: [
        { x: 0, y: 0, z: 0, color: 1 },
        { x: 1, y: 2, z: 3, color: 7 },
      ],
      palette: [0xff0000ff, 0x00ff00ff],
    };

    const decoded = decodeVoxBase64(asBase64(model));
    expect(decoded.size).toEqual(model.size);
    expect(decoded.voxels).toEqual(model.voxels);
    expect(decoded.palette?.slice(0, 2)).toEqual(model.palette);

    const inspection = inspectVox(asBase64(model));
    expect(inspection.voxel_count).toBe(2);
    expect(inspection.used_color_indexes).toEqual([1, 7]);
  });

  it("merges models with offsets and deterministic overwrite semantics", () => {
    const first = asBase64({
      size: { x: 2, y: 1, z: 1 },
      voxels: [{ x: 0, y: 0, z: 0, color: 1 }],
    });
    const second = asBase64({
      size: { x: 1, y: 1, z: 1 },
      voxels: [{ x: 0, y: 0, z: 0, color: 9 }],
    });

    const merged = mergeVoxModels([
      { voxBase64: first },
      { voxBase64: second, offset: { x: 0, y: 0, z: 0 } },
      { voxBase64: second, offset: { x: 2, y: 0, z: 0 } },
    ]);

    expect(merged.size).toEqual({ x: 3, y: 1, z: 1 });
    expect(merged.voxels).toContainEqual({ x: 0, y: 0, z: 0, color: 9 });
    expect(merged.voxels).toContainEqual({ x: 2, y: 0, z: 0, color: 9 });
  });

  it("rejects duplicate and out-of-bounds voxel input", () => {
    expect(() => encodeVox({
      size: { x: 2, y: 2, z: 2 },
      voxels: [
        { x: 0, y: 0, z: 0, color: 1 },
        { x: 0, y: 0, z: 0, color: 2 },
      ],
    })).toThrow(/Duplicate voxel coordinate/);

    expect(() => encodeVox({
      size: { x: 2, y: 2, z: 2 },
      voxels: [{ x: 2, y: 0, z: 0, color: 1 }],
    })).toThrow(/voxels\[0\]\.x/);
  });

  it("rejects malformed VOX bytes", () => {
    expect(() => decodeVoxBase64(Buffer.from("not-a-vox").toString("base64"))).toThrow(/not a MagicaVoxel VOX file/);
  });

  it("exports only exposed faces to OBJ", () => {
    const mesh = voxelModelToObj({
      size: { x: 2, y: 1, z: 1 },
      voxels: [
        { x: 0, y: 0, z: 0, color: 1 },
        { x: 1, y: 0, z: 0, color: 1 },
      ],
    });

    expect(mesh.faces).toBe(10);
    expect(mesh.vertices).toBe(40);
    expect(mesh.obj).toContain("# PalladiumAI Voxel Studio OBJ export");
  });
});
