import { z } from "zod";

export const SCENE_PRIMITIVES = ["box", "sphere", "cylinder", "cone", "torus", "plane"] as const;
export const SCENE_KINDS = [...SCENE_PRIMITIVES, "model"] as const;

const PRIMITIVE_COLORS: Record<(typeof SCENE_PRIMITIVES)[number], string> = {
  box: "#8b5cf6",
  sphere: "#38bdf8",
  cylinder: "#34d399",
  cone: "#fbbf24",
  torus: "#f472b6",
  plane: "#71717a",
};

const positionAxis = z.number().finite().min(-500).max(500);
const rotationAxis = z.number().finite().min(-3600).max(3600);
const scaleAxis = z.number().finite().min(0.05).max(50);

function publicModelUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Scene model URL is invalid.");
  }
  if (url.protocol !== "https:") throw new Error("Scene models must use https.");
  if (url.username || url.password) throw new Error("Scene model URLs cannot include credentials.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
    throw new Error("Private/local model URLs are not accepted.");
  }
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    throw new Error("Private network model URLs are not accepted.");
  }
  if (!/\.(glb|gltf)$/i.test(url.pathname))
    throw new Error("Only GLB and glTF outputs can be placed in a scene.");
  return url.toString();
}

export function isPreviewableModelUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    publicModelUrl(value);
    return true;
  } catch {
    return false;
  }
}

export const sceneObjectSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(80),
    kind: z.enum(SCENE_KINDS),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .transform((value) => value.toLowerCase()),
    position: z.tuple([positionAxis, positionAxis, positionAxis]),
    rotation: z.tuple([rotationAxis, rotationAxis, rotationAxis]),
    scale: z.tuple([scaleAxis, scaleAxis, scaleAxis]),
    visible: z.boolean(),
    sourceJobId: z.string().uuid().nullable(),
    sourceUrl: z.string().max(4000).nullable(),
  })
  .superRefine((object, ctx) => {
    if (object.kind === "model") {
      if (!object.sourceJobId || !object.sourceUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A model object needs a completed job and output URL.",
        });
        return;
      }
      try {
        publicModelUrl(object.sourceUrl);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : "Invalid model URL.",
        });
      }
      return;
    }
    if (object.sourceJobId || object.sourceUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Primitive scene objects cannot carry worker output.",
      });
    }
  });

export const sceneDocumentSchema = z
  .object({
    objects: z.array(sceneObjectSchema).max(64),
  })
  .superRefine((document, ctx) => {
    const ids = new Set<string>();
    for (const object of document.objects) {
      if (ids.has(object.id))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scene object ids must be unique." });
      ids.add(object.id);
    }
  });

export type SceneObject = z.infer<typeof sceneObjectSchema>;
export type SceneDocument = z.infer<typeof sceneDocumentSchema>;
export type OwnedJobRef = {
  id: string;
  status: string;
  output_url: string | null;
  input_name?: string | null;
};

export function parseSceneDocument(input: unknown): SceneDocument {
  const result = sceneDocumentSchema.safeParse(input);
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Scene document is invalid.");
  return result.data;
}

export function emptySceneDocument(): SceneDocument {
  return { objects: [] };
}

export function createPrimitive(
  kind: (typeof SCENE_PRIMITIVES)[number],
  index: number,
  id = crypto.randomUUID(),
): SceneObject {
  const y = kind === "plane" ? 0 : kind === "torus" ? 0.45 : 0.5;
  return sceneObjectSchema.parse({
    id,
    name: kind.charAt(0).toUpperCase() + kind.slice(1),
    kind,
    color: PRIMITIVE_COLORS[kind],
    position: [Math.min(index * 1.4, 480), y, 0],
    rotation: kind === "plane" ? [-90, 0, 0] : [0, 0, 0],
    scale: kind === "plane" ? [2, 1, 2] : [1, 1, 1],
    visible: true,
    sourceJobId: null,
    sourceUrl: null,
  });
}

export function createModelReference(
  job: OwnedJobRef,
  index: number,
  id = crypto.randomUUID(),
): SceneObject {
  if (job.status !== "completed" || !job.output_url) {
    throw new Error("Only a completed 3D job with an output URL can be placed in a scene.");
  }
  if (!isPreviewableModelUrl(job.output_url)) {
    throw new Error("Only GLB and glTF outputs can be placed in a scene.");
  }
  const name = (job.input_name ?? "Model").trim().slice(0, 80) || "Model";
  return sceneObjectSchema.parse({
    id,
    name,
    kind: "model",
    color: "#e4e4e7",
    position: [Math.min(index * 1.6, 480), 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    sourceJobId: job.id,
    sourceUrl: job.output_url,
  });
}

export function addSceneObject(document: SceneDocument, object: SceneObject): SceneDocument {
  return parseSceneDocument({ objects: [...document.objects, object] });
}

export function updateSceneObject(
  document: SceneDocument,
  id: string,
  patch: Partial<
    Pick<SceneObject, "name" | "color" | "position" | "rotation" | "scale" | "visible">
  >,
): SceneDocument {
  const current = document.objects.find((object) => object.id === id);
  if (!current) throw new Error("Scene object not found.");
  const next = sceneObjectSchema.parse({
    ...current,
    ...patch,
    id: current.id,
    kind: current.kind,
    sourceJobId: current.sourceJobId,
    sourceUrl: current.sourceUrl,
  });
  return parseSceneDocument({
    objects: document.objects.map((object) => (object.id === id ? next : object)),
  });
}

export function removeSceneObject(document: SceneDocument, id: string): SceneDocument {
  if (!document.objects.some((object) => object.id === id))
    throw new Error("Scene object not found.");
  return { objects: document.objects.filter((object) => object.id !== id) };
}

export function assertOwnedModelReferences(document: SceneDocument, jobs: OwnedJobRef[]) {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  for (const object of document.objects) {
    if (object.kind !== "model" || !object.sourceJobId || !object.sourceUrl) continue;
    const job = byId.get(object.sourceJobId);
    if (!job || job.status !== "completed" || job.output_url !== object.sourceUrl) {
      throw new Error("A scene model must reference one of your completed 3D jobs.");
    }
  }
}
