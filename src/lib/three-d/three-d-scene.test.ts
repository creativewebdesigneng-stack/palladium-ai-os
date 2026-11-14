import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import {
  addSceneObject,
  assertOwnedModelReferences,
  createModelReference,
  createPrimitive,
  duplicateSceneObject,
  emptySceneDocument,
  isPreviewableModelUrl,
  parseSceneDocument,
  removeSceneObject,
  updateSceneObject,
} from "./three-d-scene";
import { exportSceneGlb } from "./three-d-scene-export";

const id = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";

describe("3D scene documents", () => {
  it("exports a primitive scene to a GLB and keeps material edits", async () => {
    const box = createPrimitive("box", 0, id);
    expect(box.metalness).toBe(0.08);
    const edited = updateSceneObject({ objects: [box] }, id, { metalness: 0.6, roughness: 0.2 });
    const duplicated = duplicateSceneObject(edited, id, "33333333-3333-4333-8333-333333333333");
    expect(duplicated.objects).toHaveLength(2);
    expect(duplicated.objects[1]?.metalness).toBe(0.6);
    const exported = await exportSceneGlb(edited);
    expect(exported.omitted).toEqual([]);
    expect(exported.bytes.byteLength).toBeGreaterThan(80);
    expect(Buffer.from(exported.bytes.subarray(0, 4)).toString("utf8")).toBe("glTF");
  });

  it("creates an empty scene and a bounded primitive the user can edit", () => {
    const box = createPrimitive("box", 0, id);
    const document = addSceneObject(emptySceneDocument(), box);
    const moved = updateSceneObject(document, id, {
      name: "Crate",
      position: [1, 0.5, -2],
      color: "#AABBCC",
    });
    expect(moved.objects[0]).toMatchObject({
      name: "Crate",
      color: "#aabbcc",
      position: [1, 0.5, -2],
      kind: "box",
      sourceUrl: null,
    });
    expect(removeSceneObject(moved, id).objects).toEqual([]);
  });

  it("places only a completed https GLB or glTF job the user owns", () => {
    const job = {
      id: jobId,
      status: "completed",
      output_url: "https://assets.example.com/models/crate.glb",
      input_name: "Crate",
    };
    const object = createModelReference(job, 0, id);
    const document = addSceneObject(emptySceneDocument(), object);
    expect(() => assertOwnedModelReferences(document, [])).toThrow(/completed 3D jobs/);
    expect(() => assertOwnedModelReferences(document, [{ ...job, status: "failed" }])).toThrow(
      /completed 3D jobs/,
    );
    expect(() =>
      assertOwnedModelReferences(document, [
        { ...job, output_url: "https://assets.example.com/other.glb" },
      ]),
    ).toThrow(/completed 3D jobs/);
    expect(() => assertOwnedModelReferences(document, [job])).not.toThrow();
  });

  it("rejects private, insecure and non-mesh references instead of inventing geometry", () => {
    expect(isPreviewableModelUrl("http://assets.example.com/model.glb")).toBe(false);
    expect(isPreviewableModelUrl("https://127.0.0.1/model.glb")).toBe(false);
    expect(isPreviewableModelUrl("https://assets.example.com/model.obj")).toBe(false);
    expect(() =>
      createModelReference({ id: jobId, status: "queued", output_url: null }, 0, id),
    ).toThrow(/completed/);
    expect(() =>
      parseSceneDocument({
        objects: [
          {
            ...createPrimitive("sphere", 0, id),
            sourceUrl: "https://assets.example.com/model.glb",
            sourceJobId: jobId,
          },
        ],
      }),
    ).toThrow(/Primitive/);
    expect(() =>
      parseSceneDocument({
        objects: [createPrimitive("box", 0, id), createPrimitive("sphere", 1, id)],
      }),
    ).toThrow(/unique/);
  });

  it("keeps the studio screen on real saved scenes and a healthy worker", () => {
    const screen = readFileSync("src/screens/ThreeDStudio.jsx", "utf8");
    const editor = readFileSync("src/components/three-d/ThreeDSceneEditor.jsx", "utf8");
    const functions = readFileSync("src/lib/three-d/three-d-studio.functions.ts", "utf8");
    const migration = readFileSync(
      "supabase/migrations/20261114183000_three_d_scene_documents.sql",
      "utf8",
    );
    expect(screen).toContain("saveThreeDScene");
    expect(editor).toContain("Only the objects you add are saved");
    expect(screen).toContain("workerHealthy");
    expect(screen).toContain("does not invent a mesh");
    expect(screen).not.toContain("Blackstar Voxel Studio");
    expect(screen).not.toContain("sample model");
    expect(functions).toContain("three_d_scenes");
    expect(functions).toContain("assertOwnedModelReferences");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("auth.uid()");
  });

  it("persists a scene for its owner and hides it from everyone else", async () => {
    const owner = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    const db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated;
      insert into auth.users values ('${owner}'), ('${other}');
    `);
    await db.exec(
      readFileSync("supabase/migrations/20261114183000_three_d_scene_documents.sql", "utf8"),
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
    await db.exec(
      `insert into public.three_d_scenes(name, description, document) values ('Studio', 'owned', '{"objects":[]}'::jsonb);`,
    );
    const own = await db.query<{ name: string }>("select name from public.three_d_scenes");
    expect(own.rows.map((row) => row.name)).toEqual(["Studio"]);
    await db.exec(`set request.jwt.claim.sub='${other}';`);
    const hidden = await db.query("select id from public.three_d_scenes");
    expect(hidden.rows).toEqual([]);
    await expect(db.exec("update public.three_d_scenes set name='Stolen'")).resolves.toBeTruthy();
    const untouched = await db.query<{ name: string }>("select name from public.three_d_scenes");
    expect(untouched.rows).toEqual([]);
    await db.exec("reset role;");
    const stored = await db.query<{ name: string }>("select name from public.three_d_scenes");
    expect(stored.rows.map((row) => row.name)).toEqual(["Studio"]);
    await db.close();
  });
});
