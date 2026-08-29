import { decodeVoxBase64, type VoxelModel } from "./vox-codec";

const MAX_MESH_VOXELS = 10_000;
const MAX_MESH_FACES = 60_000;

type Vec3 = [number, number, number];
type Face = { normal: Vec3; corners: [Vec3, Vec3, Vec3, Vec3] };

const FACES: Face[] = [
  { normal: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { normal: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { normal: [0, -1, 0], corners: [[1, 0, 0], [0, 0, 0], [0, 0, 1], [1, 0, 1]] },
  { normal: [0, 1, 0], corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },
  { normal: [0, 0, -1], corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, 0, 1], corners: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]] },
];

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/** Converts a bounded single VOX model into an exposed-face Wavefront OBJ mesh. */
export function voxelModelToObj(model: VoxelModel): { obj: string; faces: number; vertices: number } {
  if (model.voxels.length > MAX_MESH_VOXELS) {
    throw new Error(`Mesh export supports at most ${MAX_MESH_VOXELS.toLocaleString()} voxels per operation.`);
  }

  const occupied = new Set(model.voxels.map((voxel) => key(voxel.x, voxel.y, voxel.z)));
  const vertices: string[] = [];
  const normals: string[] = [];
  const faces: string[] = [];
  let vertexIndex = 1;
  let normalIndex = 1;

  for (const voxel of model.voxels) {
    for (const face of FACES) {
      const [nx, ny, nz] = face.normal;
      if (occupied.has(key(voxel.x + nx, voxel.y + ny, voxel.z + nz))) continue;
      if (faces.length >= MAX_MESH_FACES) throw new Error(`Mesh export exceeds the ${MAX_MESH_FACES.toLocaleString()} face safety limit.`);

      normals.push(`vn ${nx} ${ny} ${nz}`);
      const indexes: number[] = [];
      for (const [cx, cy, cz] of face.corners) {
        vertices.push(`v ${voxel.x + cx} ${voxel.y + cy} ${voxel.z + cz}`);
        indexes.push(vertexIndex++);
      }
      faces.push(`f ${indexes.map((index) => `${index}//${normalIndex}`).join(" ")}`);
      normalIndex += 1;
    }
  }

  const header = [
    "# PalladiumAI Voxel Studio OBJ export",
    `# source voxels: ${model.voxels.length}`,
    `# exposed faces: ${faces.length}`,
  ];
  return {
    obj: [...header, ...vertices, ...normals, ...faces, ""].join("\n"),
    faces: faces.length,
    vertices: vertices.length,
  };
}

export function voxBase64ToObj(value: string) {
  return voxelModelToObj(decodeVoxBase64(value));
}
