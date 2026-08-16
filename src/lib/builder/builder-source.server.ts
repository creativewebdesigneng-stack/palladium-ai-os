import { z } from "zod";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";

const sourceFileSchema = z.object({
  path: z.string().trim().min(1).max(1000),
  purpose: z.string().trim().min(1).max(500),
  content: z.string().max(24000),
});

const sourceManifestSchema = z.object({
  summary: z.string().trim().min(20).max(2000),
  files: z.array(sourceFileSchema).min(1).max(12),
  setup: z.array(z.string().trim().min(1).max(500)).max(12),
  verification: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
}).superRefine((value, ctx) => {
  const seen = new Set<string>();
  let bytes = 0;
  for (const file of value.files) {
    const path = file.path.replace(/^\/+/, "");
    if (!path || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unsafe source file path.", path: ["files"] });
    }
    if (seen.has(path)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate source file path.", path: ["files"] });
    seen.add(path);
    bytes += Buffer.byteLength(file.content, "utf8");
  }
  if (bytes > 150000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Generated source exceeds the Builder manifest size limit.", path: ["files"] });
});

export type BuilderSourceManifest = z.infer<typeof sourceManifestSchema> & {
  generatedBy: { provider: Provider; model: string };
};

const SYSTEM_PROMPT = [
  "You are PalladiumAI App Builder's source-generation engine.",
  "Generate a small, coherent, production-oriented starter implementation from the approved plan.",
  "Do not claim that files have been written, repositories changed, tests run, or deployments completed.",
  "Return strict JSON and nothing else with exactly these keys: summary, files, setup, verification.",
  "files must be an array of objects with exactly path, purpose, content.",
  "Generate at most 12 essential text files. Do not emit binaries, secrets, credentials, lockfiles, node_modules, build output, or vendored dependencies.",
  "Use relative repository paths only; never use .. path traversal or absolute paths.",
  "Prefer secure defaults, environment-variable placeholders, explicit validation, and runnable tests where practical.",
  "Do not include markdown fences.",
].join(" ");

export function parseBuilderSourceManifest(text: string) {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let value: unknown;
  try {
    value = JSON.parse(unfenced);
  } catch {
    throw new Error("The AI source generator returned an invalid source format.");
  }
  const parsed = sourceManifestSchema.safeParse(value);
  if (!parsed.success) throw new Error("The AI source generator returned an unsafe or incomplete source manifest.");
  return parsed.data;
}

export async function generateBuilderSourceManifest(args: {
  title: string;
  prompt: string;
  plan: unknown;
  provider: Provider;
  model: string;
}): Promise<BuilderSourceManifest> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `App name: ${args.title}`,
        `Build request:\n${args.prompt}`,
        `Approved implementation plan:\n${JSON.stringify(args.plan)}`,
      ].join("\n\n"),
    },
  ];

  const result = await runChat({
    provider: args.provider,
    model: args.model,
    messages,
    maxTokens: 9000,
    temperature: 0.15,
  });
  if (!result.text.trim()) throw new ProviderError("The AI source generator returned an empty response.", 502, true);

  return {
    ...parseBuilderSourceManifest(result.text),
    generatedBy: { provider: result.provider, model: result.model },
  };
}
