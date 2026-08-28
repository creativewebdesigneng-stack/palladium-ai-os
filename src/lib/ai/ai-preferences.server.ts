import { normaliseProvider, resolveModel, type Provider } from "@/lib/runtime/model-gateway.server";

export type ProviderOption = {
  id: Provider;
  name: string;
  defaultModel: string;
  configured: boolean;
};

const DEFINITIONS: Array<Omit<ProviderOption, "configured">> = [
  { id: "deepseek", name: "DeepSeek V3", defaultModel: "deepseek-chat" },
  { id: "groq", name: "Groq", defaultModel: "openai/gpt-oss-120b" },
  { id: "lovable", name: "Lovable AI Gateway", defaultModel: "google/gemini-3-flash-preview" },
  { id: "openai", name: "OpenAI", defaultModel: "gpt-5-mini" },
  { id: "anthropic", name: "Anthropic", defaultModel: "claude-sonnet-4-5-20250929" },
  { id: "compatible", name: "OpenAI-compatible endpoint", defaultModel: "local-model" },
];

export function isProviderConfigured(provider: Provider): boolean {
  if (provider === "groq") return Boolean(process.env["GROQ_API_KEY"]);
  if (provider === "deepseek") return Boolean(process.env["DEEPSEEK_API_KEY"]);
  if (provider === "lovable") return Boolean(process.env["LOVABLE_API_KEY"]);
  if (provider === "openai") return Boolean(process.env["OPENAI_API_KEY"]);
  if (provider === "anthropic") return Boolean(process.env["ANTHROPIC_API_KEY"]);
  return Boolean(process.env["OPENAI_COMPATIBLE_BASE_URL"]);
}

export function getProviderOptions(): ProviderOption[] {
  return DEFINITIONS.map((definition) => ({
    ...definition,
    configured: isProviderConfigured(definition.id),
  }));
}

export function defaultModelFor(provider: Provider): string {
  return DEFINITIONS.find((definition) => definition.id === provider)?.defaultModel ?? resolveModel(provider, null);
}

type StoredPreference = { default_provider?: unknown; default_model?: unknown } | null | undefined;

export function resolveAssistantModelPreference(preference: StoredPreference): {
  provider: Provider;
  model: string;
  source: "user" | "deployment";
} {
  const deploymentProvider = normaliseProvider(process.env["ASSISTANT_PROVIDER"] ?? null);
  const deploymentModel = resolveModel(deploymentProvider, process.env["ASSISTANT_MODEL"] ?? null);

  if (!preference || typeof preference.default_provider !== "string") {
    return { provider: deploymentProvider, model: deploymentModel, source: "deployment" };
  }

  const provider = normaliseProvider(preference.default_provider);
  if (!isProviderConfigured(provider)) {
    return { provider: deploymentProvider, model: deploymentModel, source: "deployment" };
  }

  const requestedModel = typeof preference.default_model === "string" ? preference.default_model.trim() : "";
  return {
    provider,
    model: resolveModel(provider, requestedModel || defaultModelFor(provider)),
    source: "user",
  };
}
