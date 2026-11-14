import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEngineProjectZip, classifyMeshBytes, packGlb, splitGlb } from "./game-foundry-engine-bundle";

function triangleGlb() {
  const bin = new Uint8Array(36);
  const view = new DataView(bin.buffer);
  view.setFloat32(0, 0, true);
  view.setFloat32(4, 0, true);
  view.setFloat32(8, 0, true);
  view.setFloat32(12, 1, true);
  view.setFloat32(16, 0, true);
  view.setFloat32(20, 0, true);
  view.setFloat32(24, 0, true);
  view.setFloat32(28, 1, true);
  view.setFloat32(32, 0, true);
  return packGlb({
    asset: { version: "2.0" },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  }, bin);
}

describe("Game Foundry engine bundle", () => {
  it("splits a real GLB into glTF JSON and the same buffer", () => {
    const glb = triangleGlb();
    expect(classifyMeshBytes(glb)).toBe("glb");
    const split = splitGlb(glb);
    const document = JSON.parse(new TextDecoder().decode(split.gltf));
    expect(document.buffers[0].uri).toBe("model.bin");
    expect(document.buffers[0].byteLength).toBe(split.bin.length);
    expect(split.bin.length).toBe(36);
    expect(document.meshes[0].primitives[0].attributes.POSITION).toBe(0);
  });

  it("packs Godot and Unity projects from downloaded mesh bytes and refuses pages", () => {
    const glb = triangleGlb();
    const obj = new TextEncoder().encode("o crate\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
    const html = new TextEncoder().encode("<!DOCTYPE html><html>Access restricted</html>");
    expect(classifyMeshBytes(html)).toBeNull();
    expect(() => buildEngineProjectZip({
      engine: "godot",
      projectName: "Empty",
      prompt: "none",
      assets: [{ name: "page", bytes: html }],
    })).toThrow(/No completed mesh/);

    const godot = buildEngineProjectZip({
      engine: "godot",
      projectName: "Arena",
      prompt: "A small arena",
      assets: [{ name: "Crate", bytes: glb }, { name: "Ramp", bytes: obj }],
      sourceFiles: [{ path: "scripts/player.gd", content: "extends Node3D\n" }],
    });
    expect(godot.embeddedAssetCount).toBe(2);
    expect(godot.formats).toEqual(expect.arrayContaining(["glb", "gltf", "obj"]));
    expect(godot.files).toContain("project.godot");
    expect(godot.files).toContain("scenes/main.tscn");
    expect(godot.files.some((file) => file.endsWith(".glb"))).toBe(true);
    expect(godot.files.some((file) => file.endsWith(".gltf"))).toBe(true);

    const unity = buildEngineProjectZip({
      engine: "unity",
      projectName: "Arena",
      prompt: "A small arena",
      assets: [{ name: "Crate", bytes: glb }],
    });
    expect(unity.files).toContain("Packages/manifest.json");
    expect(unity.files).toContain("ProjectSettings/ProjectVersion.txt");

    const directory = mkdtempSync(join(tmpdir(), "foundry-zip-"));
    const zipPath = join(directory, godot.filename);
    writeFileSync(zipPath, godot.zip);
    const listing = execFileSync("python3", ["-c", "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print('\\n'.join(z.namelist())); print(z.read('project.godot').decode())", zipPath], { encoding: "utf8" });
    expect(listing).toContain("project.godot");
    expect(listing).toContain('config/name="Arena"');
    const glbName = godot.files.find((file) => file.endsWith(".glb"));
    expect(glbName).toBeTruthy();
    const extracted = execFileSync("python3", ["-c", "import sys,zipfile; print(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]).hex())", zipPath, glbName!], { encoding: "utf8" }).trim();
    expect(extracted).toBe(Buffer.from(glb).toString("hex"));
    expect(readFileSync(zipPath).subarray(0, 2).toString()).toBe("PK");
  });
});
