const MAGIC = "VOX ";
const VERSION = 150;
const MAX_AXIS = 256;
const MAX_VOXELS = 100_000;
const MAX_INPUT_BYTES = 4 * 1024 * 1024;

export type Voxel = { x: number; y: number; z: number; color: number };
export type VoxelModel = {
  size: { x: number; y: number; z: number };
  voxels: Voxel[];
  palette?: number[];
};
export type VoxelMergeInput = { voxBase64: string; offset?: { x?: number; y?: number; z?: number } };

function integer(value: unknown, label: string, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  }
  return number;
}

function validated(model: VoxelModel): VoxelModel {
  const size = {
    x: integer(model?.size?.x, "size.x", 1, MAX_AXIS),
    y: integer(model?.size?.y, "size.y", 1, MAX_AXIS),
    z: integer(model?.size?.z, "size.z", 1, MAX_AXIS),
  };
  if (!Array.isArray(model?.voxels) || model.voxels.length > MAX_VOXELS) {
    throw new Error(`voxels must contain at most ${MAX_VOXELS.toLocaleString()} entries.`);
  }
  const seen = new Set<string>();
  const voxels = model.voxels.map((voxel, index) => {
    const result = {
      x: integer(voxel?.x, `voxels[${index}].x`, 0, size.x - 1),
      y: integer(voxel?.y, `voxels[${index}].y`, 0, size.y - 1),
      z: integer(voxel?.z, `voxels[${index}].z`, 0, size.z - 1),
      color: integer(voxel?.color, `voxels[${index}].color`, 1, 255),
    };
    const key = `${result.x},${result.y},${result.z}`;
    if (seen.has(key)) throw new Error(`Duplicate voxel coordinate ${key}.`);
    seen.add(key);
    return result;
  });
  const palette = model.palette?.map((rgba, index) => integer(rgba, `palette[${index}]`, 0, 0xffffffff));
  if (palette && palette.length > 256) throw new Error("palette must contain at most 256 RGBA entries.");
  return { size, voxels, ...(palette ? { palette } : {}) };
}

function chunk(id: string, content: Buffer, children = Buffer.alloc(0)): Buffer {
  const header = Buffer.alloc(12);
  header.write(id, 0, 4, "ascii");
  header.writeInt32LE(content.length, 4);
  header.writeInt32LE(children.length, 8);
  return Buffer.concat([header, content, children]);
}

export function encodeVox(input: VoxelModel): Buffer {
  const model = validated(input);
  const size = Buffer.alloc(12);
  size.writeInt32LE(model.size.x, 0);
  size.writeInt32LE(model.size.y, 4);
  size.writeInt32LE(model.size.z, 8);

  const xyzi = Buffer.alloc(4 + model.voxels.length * 4);
  xyzi.writeInt32LE(model.voxels.length, 0);
  model.voxels.forEach((voxel, index) => {
    const at = 4 + index * 4;
    xyzi.writeUInt8(voxel.x, at);
    xyzi.writeUInt8(voxel.y, at + 1);
    xyzi.writeUInt8(voxel.z, at + 2);
    xyzi.writeUInt8(voxel.color, at + 3);
  });

  const children = [chunk("SIZE", size), chunk("XYZI", xyzi)];
  if (model.palette?.length) {
    const rgba = Buffer.alloc(1024);
    model.palette.forEach((color, index) => rgba.writeUInt32LE(color >>> 0, index * 4));
    children.push(chunk("RGBA", rgba));
  }
  const main = chunk("MAIN", Buffer.alloc(0), Buffer.concat(children));
  const header = Buffer.alloc(8);
  header.write(MAGIC, 0, 4, "ascii");
  header.writeInt32LE(VERSION, 4);
  return Buffer.concat([header, main]);
}

function decodeBase64(value: string): Buffer {
  if (typeof value !== "string" || !value.trim()) throw new Error("vox_base64 is required.");
  const compact = value.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw new Error("vox_base64 is not valid base64.");
  const bytes = Buffer.from(compact, "base64");
  if (!bytes.length || bytes.length > MAX_INPUT_BYTES) throw new Error(`VOX input must be between 1 byte and ${MAX_INPUT_BYTES} bytes.`);
  return bytes;
}

export function decodeVoxBase64(value: string): VoxelModel {
  const buffer = decodeBase64(value);
  if (buffer.length < 20 || buffer.toString("ascii", 0, 4) !== MAGIC) throw new Error("Input is not a MagicaVoxel VOX file.");
  const version = buffer.readInt32LE(4);
  if (version < 100 || version > 200) throw new Error(`Unsupported VOX version ${version}.`);
  if (buffer.toString("ascii", 8, 12) !== "MAIN") throw new Error("VOX MAIN chunk is missing.");
  const mainContent = buffer.readInt32LE(12);
  const mainChildren = buffer.readInt32LE(16);
  let offset = 20 + mainContent;
  const end = Math.min(buffer.length, offset + mainChildren);
  let size: VoxelModel["size"] | null = null;
  let voxels: Voxel[] | null = null;
  let palette: number[] | undefined;

  while (offset + 12 <= end) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const contentLength = buffer.readInt32LE(offset + 4);
    const childrenLength = buffer.readInt32LE(offset + 8);
    const contentAt = offset + 12;
    const next = contentAt + contentLength + childrenLength;
    if (contentLength < 0 || childrenLength < 0 || next > buffer.length || next <= offset) throw new Error("VOX chunk bounds are invalid.");
    if (id === "SIZE" && contentLength >= 12 && !size) {
      size = {
        x: integer(buffer.readInt32LE(contentAt), "size.x", 1, MAX_AXIS),
        y: integer(buffer.readInt32LE(contentAt + 4), "size.y", 1, MAX_AXIS),
        z: integer(buffer.readInt32LE(contentAt + 8), "size.z", 1, MAX_AXIS),
      };
    } else if (id === "XYZI" && contentLength >= 4 && !voxels) {
      const count = buffer.readInt32LE(contentAt);
      if (count < 0 || count > MAX_VOXELS || 4 + count * 4 > contentLength) throw new Error("VOX XYZI count is invalid or exceeds the safety limit.");
      voxels = Array.from({ length: count }, (_, index) => {
        const at = contentAt + 4 + index * 4;
        return { x: buffer.readUInt8(at), y: buffer.readUInt8(at + 1), z: buffer.readUInt8(at + 2), color: buffer.readUInt8(at + 3) };
      });
    } else if (id === "RGBA" && contentLength >= 1024) {
      palette = Array.from({ length: 256 }, (_, index) => buffer.readUInt32LE(contentAt + index * 4));
    }
    offset = next;
  }
  if (!size || !voxels) throw new Error("VOX file does not contain a readable SIZE/XYZI model.");
  return validated({ size, voxels, ...(palette ? { palette } : {}) });
}

export function inspectVox(value: string) {
  const model = decodeVoxBase64(value);
  const usedColors = [...new Set(model.voxels.map((voxel) => voxel.color))].sort((a, b) => a - b);
  return {
    format: "MagicaVoxel VOX",
    version: VERSION,
    size: model.size,
    voxel_count: model.voxels.length,
    used_color_indexes: usedColors,
    has_custom_palette: Boolean(model.palette?.length),
    sample_voxels: model.voxels.slice(0, 128),
    truncated_sample: model.voxels.length > 128,
  };
}

export function mergeVoxModels(inputs: VoxelMergeInput[]): VoxelModel {
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 16) throw new Error("models must contain between 1 and 16 VOX inputs.");
  const merged = new Map<string, Voxel>();
  let maxX = 0; let maxY = 0; let maxZ = 0;
  let palette: number[] | undefined;
  for (const [index, input] of inputs.entries()) {
    const model = decodeVoxBase64(input.voxBase64);
    const ox = integer(input.offset?.x ?? 0, `models[${index}].offset.x`, 0, 255);
    const oy = integer(input.offset?.y ?? 0, `models[${index}].offset.y`, 0, 255);
    const oz = integer(input.offset?.z ?? 0, `models[${index}].offset.z`, 0, 255);
    if (!palette && model.palette) palette = model.palette;
    for (const voxel of model.voxels) {
      const x = voxel.x + ox; const y = voxel.y + oy; const z = voxel.z + oz;
      if (x >= MAX_AXIS || y >= MAX_AXIS || z >= MAX_AXIS) throw new Error("Merged model exceeds the 256-voxel axis limit.");
      merged.set(`${x},${y},${z}`, { ...voxel, x, y, z });
      if (merged.size > MAX_VOXELS) throw new Error(`Merged model exceeds ${MAX_VOXELS.toLocaleString()} voxels.`);
      maxX = Math.max(maxX, x + 1); maxY = Math.max(maxY, y + 1); maxZ = Math.max(maxZ, z + 1);
    }
  }
  return validated({ size: { x: Math.max(1, maxX), y: Math.max(1, maxY), z: Math.max(1, maxZ) }, voxels: [...merged.values()], ...(palette ? { palette } : {}) });
}
