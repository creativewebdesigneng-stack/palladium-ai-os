export type EngineBundleFile = { path: string; data: Uint8Array };
export type EngineBundleAsset = { name: string; bytes: Uint8Array };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let crc = n;
    for (let k = 0; k < 8; k += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    table[n] = crc >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function encode(value: string) {
  return textEncoder.encode(value);
}

function slug(value: string, fallback: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || fallback;
}

export function classifyMeshBytes(bytes: Uint8Array): "glb" | "obj" | "gltf" | null {
  if (bytes.length >= 12 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) return "glb";
  const sample = textDecoder.decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
  const trimmed = sample.trimStart();
  if (trimmed.startsWith("<")) return null;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(textDecoder.decode(bytes));
      if (parsed && typeof parsed === "object" && parsed.asset && typeof parsed.asset.version === "string") return "gltf";
    } catch {
      return null;
    }
    return null;
  }
  if (/(^|\n)v\s+[-+\d.eE]+/.test(sample)) return "obj";
  return null;
}

export function packGlb(document: object, bin: Uint8Array) {
  const json = encode(JSON.stringify(document));
  const jsonPad = (4 - (json.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + json.length + jsonPad + 8 + bin.length + binPad;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  let offset = 12;
  view.setUint32(offset, json.length + jsonPad, true);
  view.setUint32(offset + 4, 0x4e4f534a, true);
  out.set(json, offset + 8);
  out.fill(0x20, offset + 8 + json.length, offset + 8 + json.length + jsonPad);
  offset += 8 + json.length + jsonPad;
  view.setUint32(offset, bin.length + binPad, true);
  view.setUint32(offset + 4, 0x004e4942, true);
  out.set(bin, offset + 8);
  return out;
}

export function splitGlb(bytes: Uint8Array) {
  if (bytes.length < 20 || textDecoder.decode(bytes.subarray(0, 4)) !== "glTF") {
    throw new Error("Mesh is not a GLB file, so it cannot be exported as glTF.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint32(4, true);
  const length = view.getUint32(8, true);
  if (version !== 2 || length !== bytes.length) throw new Error("GLB header does not match the file.");
  let offset = 12;
  let jsonChunk: Uint8Array | null = null;
  let binChunk = new Uint8Array();
  while (offset + 8 <= bytes.length) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = textDecoder.decode(bytes.subarray(offset + 4, offset + 8));
    offset += 8;
    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === "JSON") jsonChunk = chunk;
    if (chunkType.startsWith("BIN")) binChunk = Uint8Array.from(chunk.subarray(0, chunkLength));
  }
  if (!jsonChunk) throw new Error("GLB did not contain a JSON chunk.");
  let trimmed = textDecoder.decode(jsonChunk).trimEnd();
  while (trimmed.endsWith("\u0000")) trimmed = trimmed.slice(0, -1);
  const document = JSON.parse(trimmed) as { buffers?: Array<{ uri?: string; byteLength?: number }> };
  const buffers = Array.isArray(document.buffers) ? document.buffers : [];
  if (buffers[0]) {
    buffers[0].uri = "model.bin";
    buffers[0].byteLength = binChunk.length;
  }
  return { gltf: encode(JSON.stringify(document)), bin: binChunk };
}

function zipStore(files: EngineBundleFile[]) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encode(file.path);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.data.length, true);
    localView.setUint32(22, file.data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, file.data);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.data.length, true);
    centralView.setUint32(24, file.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + file.data.length;
  }
  const centralStart = offset;
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralStart, true);
  const parts = [...locals, ...centrals, end];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    zip.set(part, cursor);
    cursor += part.length;
  }
  return zip;
}

function safeRelative(path: string) {
  const cleaned = path.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.split("/").some((part) => part === ".." || part === "")) return null;
  return cleaned;
}

function engineReadme(engine: string, projectName: string, files: string[], omitted: string[]) {
  const lines = [
    `${projectName} — Blackstar Game Foundry ${engine} handoff`,
    "",
    "Every mesh in this archive was downloaded from a completed 3D job.",
    "GLB files are the downloaded bytes. glTF JSON and model.bin files are a container split of that same GLB, not a newly generated mesh.",
    "OBJ files are the downloaded bytes.",
    "",
    "Files:",
    ...files.map((file) => `- ${file}`),
  ];
  if (omitted.length) {
    lines.push("", "Left out:", ...omitted.map((item) => `- ${item}`));
  }
  if (engine === "godot") {
    lines.push("", "Open this folder in Godot 4. The main scene instances the first GLB. Godot imports it on open.");
  } else if (engine === "unity") {
    lines.push("", "Open this folder in Unity 2022.3 or newer. Packages/manifest.json requests the open-source glTFast importer. Unity imports GLB files under Assets after that package resolves. This archive does not contain a Unity player build.");
  } else if (engine === "unreal") {
    lines.push("", "Open the .uproject in Unreal Engine 5.4 or newer. The mesh bytes are under Content/BlackstarGameFoundry. Unreal does not import GLB as a native uasset until an importer plugin is enabled.");
  } else if (engine === "zmodeler") {
    lines.push("", "ZModeler3 can import the OBJ or GLB files in this folder. This is not a .z3d document and not a GTA V archive.");
  } else {
    lines.push("", "Import the mesh files with the target DCC or engine. No engine binary is included.");
  }
  return lines.join("\n") + "\n";
}

export function buildEngineProjectZip(input: {
  engine: string;
  projectName: string;
  prompt: string;
  assets: EngineBundleAsset[];
  sourceFiles?: { path: string; content: string }[];
  omitted?: string[];
}) {
  const engine = (input.engine || "generic").toLowerCase();
  const projectSlug = slug(input.projectName, "game-project");
  const omitted = [...(input.omitted ?? [])];
  const files: EngineBundleFile[] = [];
  const formats = new Set<string>();
  let embedded = 0;
  let firstGlb: string | null = null;
  const assetRoot = engine === "unity"
    ? "Assets/BlackstarGameFoundry"
    : engine === "unreal"
      ? "Content/BlackstarGameFoundry"
      : engine === "godot"
        ? "assets"
        : "BlackstarGameFoundry";

  input.assets.forEach((asset, index) => {
    const kind = classifyMeshBytes(asset.bytes);
    const stem = `${String(index + 1).padStart(2, "0")}-${slug(asset.name, "asset")}`;
    if (kind === "glb") {
      const glbPath = `${assetRoot}/${stem}.glb`;
      files.push({ path: glbPath, data: asset.bytes });
      formats.add("glb");
      firstGlb ??= glbPath;
      try {
        const split = splitGlb(asset.bytes);
        const gltf = textDecoder.decode(split.gltf).replaceAll("model.bin", `${stem}.bin`);
        files.push({ path: `${assetRoot}/${stem}.gltf`, data: encode(gltf) });
        files.push({ path: `${assetRoot}/${stem}.bin`, data: split.bin });
        formats.add("gltf");
      } catch (error) {
        omitted.push(`${asset.name}: GLB could not be split into glTF (${error instanceof Error ? error.message : "invalid GLB"}). The original GLB is still included.`);
      }
      embedded += 1;
      return;
    }
    if (kind === "obj") {
      files.push({ path: `${assetRoot}/${stem}.obj`, data: asset.bytes });
      formats.add("obj");
      embedded += 1;
      return;
    }
    if (kind === "gltf") {
      const parsed = JSON.parse(textDecoder.decode(asset.bytes)) as { buffers?: Array<{ uri?: string }> };
      const external = (parsed.buffers ?? []).some((buffer) => buffer.uri && !String(buffer.uri).startsWith("data:"));
      if (external) {
        omitted.push(`${asset.name}: glTF references an external buffer that was not part of the download.`);
        return;
      }
      files.push({ path: `${assetRoot}/${stem}.gltf`, data: asset.bytes });
      formats.add("gltf");
      embedded += 1;
      return;
    }
    omitted.push(`${asset.name}: downloaded file is not a GLB, glTF or OBJ mesh.`);
  });

  if (!embedded) {
    throw new Error(`No completed mesh could be packed. ${omitted.join(" ") || "Generate a 3D asset and wait until it has an output file."}`);
  }

  for (const source of input.sourceFiles ?? []) {
    const relative = safeRelative(source.path);
    if (!relative || typeof source.content !== "string") continue;
    files.push({ path: `source/${relative}`, data: encode(source.content) });
  }

  if (engine === "godot") {
    const mainScene = firstGlb
      ? `[gd_scene load_steps=2 format=3]\n\n[ext_resource type="PackedScene" path="res://${firstGlb}" id="1"]\n\n[node name="Main" type="Node3D"]\n\n[node name="Model" parent="." instance=ExtResource("1")]\n\n[node name="Camera3D" type="Camera3D" parent="."]\ntransform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1.6, 4)\n`
      : `[gd_scene format=3]\n\n[node name="Main" type="Node3D"]\n\n[node name="Camera3D" type="Camera3D" parent="."]\ntransform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1.6, 4)\n`;
    files.push({ path: "scenes/main.tscn", data: encode(mainScene) });
    const title = input.projectName.replaceAll('"', "").replaceAll("\n", " ").slice(0, 80) || "Blackstar Game";
    files.push({
      path: "project.godot",
      data: encode(`; Engine configuration file.\nconfig_version=5\n\n[application]\nconfig/name="${title}"\nrun/main_scene="res://scenes/main.tscn"\nconfig/features=PackedStringArray("4.3")\n\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n`),
    });
  } else if (engine === "unity") {
    files.push({
      path: "ProjectSettings/ProjectVersion.txt",
      data: encode("m_EditorVersion: 2022.3.62f1\nm_EditorVersionWithRevision: 2022.3.62f1 (000000000000)\n"),
    });
    files.push({
      path: "Packages/manifest.json",
      data: encode(`${JSON.stringify({
        dependencies: {
          "com.atteneder.gltfast": "6.8.0",
          "com.unity.modules.assetbundle": "1.0.0",
          "com.unity.ugui": "1.0.0",
        },
      }, null, 2)}\n`),
    });
  } else if (engine === "unreal") {
    files.push({
      path: `${projectSlug}.uproject`,
      data: encode(`${JSON.stringify({
        FileVersion: 3,
        EngineAssociation: "5.4",
        Category: "",
        Description: input.prompt.slice(0, 240),
        Modules: [],
        Plugins: [],
      }, null, 2)}\n`),
    });
  }

  const names = files.map((file) => file.path);
  files.push({ path: "README.txt", data: encode(engineReadme(engine, input.projectName, names, omitted)) });
  return {
    zip: zipStore(files),
    filename: `${projectSlug}-${slug(engine, "generic")}-blackstar-engine.zip`,
    embeddedAssetCount: embedded,
    formats: [...formats],
    files: [...names, "README.txt"],
    omitted,
  };
}
