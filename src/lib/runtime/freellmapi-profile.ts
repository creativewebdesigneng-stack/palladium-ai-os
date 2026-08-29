export const FREELLMAPI_PROFILE = {
  id: "freellmapi",
  name: "FreeLLMAPI",
  protocol: "openai-compatible",
  palladiumProvider: "compatible",
  baseUrlEnv: "OPENAI_COMPATIBLE_BASE_URL",
  apiKeyEnv: "OPENAI_COMPATIBLE_API_KEY",
  chatPath: "/chat/completions",
  deploymentPathSuffix: "/v1",
  routingOwner: "upstream",
  capabilities: [
    "provider-pooling",
    "rate-limit-aware-routing",
    "fallback-routing",
    "streaming",
    "tool-calls",
  ],
} as const;
