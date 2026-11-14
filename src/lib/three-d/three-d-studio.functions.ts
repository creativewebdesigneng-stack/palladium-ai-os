import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { assertOwnedModelReferences, parseSceneDocument, type SceneDocument } from "./three-d-scene";
import { createOwnedUploadUrl, signStoragePath, storeMeshBytes, uploadedByteSize } from "./three-d-storage.server";
import { getThreeDJob, getThreeDRuntimeCapabilities, probeThreeDWorker, submitThreeDJob } from "./three-d-runtime.server";

type Sb = { from: (table: string) => any };
const outputFormat = z.enum(["glb","gltf","obj","ply","stl","vox"]);

function validateThreeDWorkerEvidence(worker: any) {
  if (worker?.status === "completed" && !worker.outputUrl) {
    return { ...worker, status: "failed", errorMessage: "3D worker reported completed without an output URL." };
  }
  return worker;
}

export const getThreeDStudioOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("three_d_jobs").select("id,input_name,source_url,workflow,requested_format,status,worker_job_id,output_url,preview_url,error_message,metadata,created_at,updated_at,completed_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return { capabilities: getThreeDRuntimeCapabilities(), jobs: result.data ?? [] };
  });

export const certifyThreeDStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [worker, evidence] = await Promise.all([
      probeThreeDWorker(),
      sb.from("three_d_jobs")
        .select("id,input_name,requested_format,status,worker_job_id,output_url,preview_url,completed_at,updated_at")
        .eq("user_id", context.userId)
        .eq("status", "completed")
        .not("output_url", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (evidence.error) throw new Error(evidence.error.message);
    const operationallyReady = worker.healthy;
    const executionCertified = Boolean(worker.healthy && evidence.data?.output_url);
    const blockers = [
      ...(worker.healthy ? [] : [worker.error || "3D worker is not healthy."]),
      ...(evidence.data?.output_url ? [] : ["Complete at least one real 3D Studio job with a persisted output URL."]),
    ];
    return {
      codeReady: true,
      operationallyReady,
      executionCertified,
      worker,
      latestEvidence: evidence.data ? {
        id: evidence.data.id,
        inputName: evidence.data.input_name,
        requestedFormat: evidence.data.requested_format,
        outputUrl: evidence.data.output_url,
        previewUrl: evidence.data.preview_url,
        workerJobId: evidence.data.worker_job_id,
        completedAt: evidence.data.completed_at,
        updatedAt: evidence.data.updated_at,
      } : null,
      blockers,
      certifiedAt: executionCertified ? evidence.data.completed_at : null,
      note: executionCertified
        ? "3D Studio has a healthy live worker and persisted completed output evidence."
        : operationallyReady
          ? "The live 3D worker is healthy, but execution certification still requires a real completed output owned by this user."
          : "3D Studio engineering is present, but operational certification remains blocked until the live worker is healthy.",
    };
  });

export const createThreeDJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ inputName: z.string().trim().min(1).max(240), sourceUrl: z.string().url().max(4000), outputFormat }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const created = await sb.from("three_d_jobs").insert({ user_id: context.userId, input_name: data.inputName, source_url: data.sourceUrl, workflow: "image-to-mesh", requested_format: data.outputFormat, status: "queued" }).select("id").single();
    if (created.error) throw new Error(created.error.message);
    try {
      const raw = await submitThreeDJob(data);
      let outputUrl = raw.outputUrl;
      let metadata = raw.metadata;
      if (raw.status === "completed" && !outputUrl && raw.inlineGlbBase64) {
        const stored = await storeMeshBytes(context.userId, created.data.id, raw.inlineGlbBase64);
        outputUrl = stored.url;
        metadata = { ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}), storage_path: stored.path };
      }
      const worker = validateThreeDWorkerEvidence({ ...raw, outputUrl, metadata });
      const completedAt = ["completed","failed","cancelled"].includes(worker.status) ? new Date().toISOString() : null;
      const update = await sb.from("three_d_jobs").update({ worker_job_id: worker.workerJobId, status: worker.status, output_url: worker.outputUrl, preview_url: worker.previewUrl, error_message: worker.errorMessage, metadata: worker.metadata, completed_at: completedAt, updated_at: new Date().toISOString() }).eq("id", created.data.id);
      if (update.error) throw new Error(update.error.message);
      await writeAudit({ userId: context.userId, orgId: null, action: "three_d.submitted", targetType: "three_d_job", targetId: created.data.id, status: "success", metadata: { format: data.outputFormat, provider: "modly-compatible" } });
      const { inlineGlbBase64: _inline, ...publicWorker } = worker;
      return { id: created.data.id, ...publicWorker };
    } catch (error) {
      const message = error instanceof Error ? error.message : "3D generation failed";
      await sb.from("three_d_jobs").update({ status: "failed", error_message: message.slice(0, 1000), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", created.data.id);
      throw error;
    }
  });

export const refreshThreeDJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const job = await sb.from("three_d_jobs").select("id,worker_job_id").eq("id", data.id).maybeSingle();
    if (job.error) throw new Error(job.error.message);
    if (!job.data) throw new Error("3D job not found or access denied.");
    if (!job.data.worker_job_id) throw new Error("This 3D job was not accepted by the worker.");
    const worker = validateThreeDWorkerEvidence(await getThreeDJob(String(job.data.worker_job_id)));
    const completedAt = ["completed","failed","cancelled"].includes(worker.status) ? new Date().toISOString() : null;
    const updated = await sb.from("three_d_jobs").update({ status: worker.status, output_url: worker.outputUrl, preview_url: worker.previewUrl, error_message: worker.errorMessage, metadata: worker.metadata, completed_at: completedAt, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (updated.error) throw new Error(updated.error.message);
    return { id: data.id, ...worker };
  });

const sceneInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(""),
  document: z.unknown(),
  thumbnail: z.string().max(80000).nullable().optional(),
});

function sceneDto(row: any) {
  const parsed = parseSceneDocumentSafe(row?.document);
  return {
    id: String(row.id),
    name: String(row.name ?? "Untitled scene"),
    description: String(row.description ?? ""),
    document: parsed,
    thumbnail: typeof row.thumbnail === "string" ? row.thumbnail : null,
    readable: parsed !== null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function parseSceneDocumentSafe(input: unknown) {
  try { return parseSceneDocument(input); } catch { return null; }
}

async function ownedJobsFor(sb: Sb, userId: string, ids: string[]) {
  if (!ids.length) return [];
  const result = await sb.from("three_d_jobs").select("id,status,output_url,input_name").eq("user_id", userId).in("id", ids);
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

export const listThreeDScenes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("three_d_scenes").select("id,name,description,document,thumbnail,created_at,updated_at").eq("user_id", context.userId).order("updated_at", { ascending: false }).limit(40);
    if (result.error) throw new Error(result.error.message);
    return { scenes: await Promise.all((result.data ?? []).map((row: any) => presentScene(sb, context.userId, row))) };
  });

export const saveThreeDScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sceneInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const parsed = parseSceneDocument(data.document);
    const document = normalizeStoredDocument(parsed);
    const modelIds = [...new Set(document.objects.flatMap((object) => object.kind === "model" && object.sourceJobId ? [object.sourceJobId] : []))];
    const uploadIds = [...new Set(document.objects.flatMap((object) => object.uploadId ? [object.uploadId] : []))];
    assertOwnedModelReferences(document, await ownedJobsFor(sb, context.userId, modelIds), await ownedUploadsFor(sb, context.userId, uploadIds));
    const thumbnail = cleanThumbnail(data.thumbnail);
    const row = { name: data.name, description: data.description, document, thumbnail, updated_at: new Date().toISOString() };
    const result = data.id
      ? await sb.from("three_d_scenes").update(row).eq("id", data.id).eq("user_id", context.userId).select("id,name,description,document,thumbnail,created_at,updated_at").single()
      : await sb.from("three_d_scenes").insert({ ...row, user_id: context.userId }).select("id,name,description,document,thumbnail,created_at,updated_at").single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? "3D scene could not be saved.");
    await writeAudit({ userId: context.userId, orgId: null, action: "three_d.scene_saved", targetType: "three_d_scene", targetId: result.data.id, status: "success", metadata: { objects: document.objects.length } });
    return { scene: await presentScene(sb, context.userId, result.data) };
  });

export const deleteThreeDScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("three_d_scenes").delete().eq("id", data.id).eq("user_id", context.userId).select("id").maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("3D scene not found or access denied.");
    await writeAudit({ userId: context.userId, orgId: null, action: "three_d.scene_deleted", targetType: "three_d_scene", targetId: data.id, status: "success", metadata: {} });
    return { id: data.id };
  });

export const renameThreeDJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), inputName: z.string().trim().min(1).max(240) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("three_d_jobs").update({ input_name: data.inputName, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).select("id,input_name").maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("3D job not found or access denied.");
    await writeAudit({ userId: context.userId, orgId: null, action: "three_d.renamed", targetType: "three_d_job", targetId: data.id, status: "success", metadata: {} });
    return { id: result.data.id, inputName: result.data.input_name };
  });

function cleanThumbnail(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("data:image/jpeg;base64,") || value.length > 80000) throw new Error("Scene thumbnail must be a small JPEG.");
  return value;
}

function normalizeStoredDocument(document: SceneDocument): SceneDocument {
  return {
    objects: document.objects.map((object) => object.uploadId ? { ...object, sourceUrl: null } : object),
  };
}

async function ownedUploadsFor(sb: Sb, userId: string, ids: string[]) {
  if (!ids.length) return [];
  const result = await sb.from("three_d_uploads").select("id,object_path").eq("user_id", userId).in("id", ids);
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

async function presentScene(sb: Sb, userId: string, row: any) {
  const scene = sceneDto(row);
  if (!scene.document) return scene;
  const uploadIds = scene.document.objects.flatMap((object) => object.uploadId ? [object.uploadId] : []);
  if (!uploadIds.length) return scene;
  const uploads = await ownedUploadsFor(sb, userId, uploadIds);
  const signed = new Map<string, string>();
  for (const upload of uploads) {
    const url = await signStoragePath(String(upload.object_path)).catch(() => null);
    if (url) signed.set(String(upload.id), url);
  }
  return {
    ...scene,
    document: {
      objects: scene.document.objects.map((object) => object.uploadId && signed.has(object.uploadId)
        ? { ...object, sourceUrl: signed.get(object.uploadId) ?? null }
        : object),
    },
  };
}

export const createThreeDModelUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ filename: z.string().trim().min(1).max(180) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const extension = data.filename.toLowerCase().endsWith(".gltf") ? "gltf" : data.filename.toLowerCase().endsWith(".glb") ? "glb" : "";
    if (!extension) throw new Error("Upload a .glb or .gltf file.");
    const id = crypto.randomUUID();
    const prepared = await createOwnedUploadUrl(context.userId, id, extension);
    const created = await sb.from("three_d_uploads").insert({ id, user_id: context.userId, filename: data.filename, object_path: prepared.path }).select("id,object_path,filename").single();
    if (created.error) throw new Error(created.error.message);
    return { id, filename: data.filename, objectPath: prepared.path, uploadUrl: prepared.uploadUrl, token: prepared.token };
  });

export const finalizeThreeDModelUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const upload = await sb.from("three_d_uploads").select("id,object_path,filename").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (upload.error) throw new Error(upload.error.message);
    if (!upload.data) throw new Error("3D upload not found or access denied.");
    const size = await uploadedByteSize(String(upload.data.object_path));
    if (size == null) throw new Error("The model file was not stored.");
    if (size < 128 || size > 40_000_000) throw new Error("The model file is outside the 128 byte to 40 MB limit.");
    const updated = await sb.from("three_d_uploads").update({ byte_size: size }).eq("id", data.id).eq("user_id", context.userId);
    if (updated.error) throw new Error(updated.error.message);
    const signedUrl = await signStoragePath(String(upload.data.object_path));
    return { id: data.id, filename: upload.data.filename, signedUrl };
  });
