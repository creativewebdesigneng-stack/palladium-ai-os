export type DeepSeekDeploymentProfile = {
  id: "16b" | "236b" | "671b" | "v3.1";
  label: string;
  parameters: string;
  layers: number;
  heads: number;
  routedExperts: number;
  activatedExperts: number;
  dtype: "configurable" | "fp8";
  contextTokens: number;
  scaleFormat?: "ue8m0";
};

export const DEEPSEEK_V3_PROFILES: readonly DeepSeekDeploymentProfile[] = [
  { id: "16b", label: "DeepSeek 16B reference", parameters: "16B class", layers: 27, heads: 16, routedExperts: 64, activatedExperts: 6, dtype: "configurable", contextTokens: 128_000 },
  { id: "236b", label: "DeepSeek 236B reference", parameters: "236B", layers: 60, heads: 128, routedExperts: 160, activatedExperts: 6, dtype: "configurable", contextTokens: 128_000 },
  { id: "671b", label: "DeepSeek V3", parameters: "671B total / 37B active", layers: 61, heads: 128, routedExperts: 256, activatedExperts: 8, dtype: "fp8", contextTokens: 128_000 },
  { id: "v3.1", label: "DeepSeek V3.1", parameters: "671B total / 37B active", layers: 61, heads: 128, routedExperts: 256, activatedExperts: 8, dtype: "fp8", contextTokens: 128_000, scaleFormat: "ue8m0" },
] as const;

export const DEEPSEEK_RUNTIME_OPTIONS = [
  "DeepSeek hosted OpenAI-compatible API",
  "SGLang",
  "vLLM",
  "LMDeploy",
  "TensorRT-LLM",
  "LightLLM",
  "AMD GPU via SGLang",
  "Huawei Ascend NPU",
] as const;

export const DEEPSEEK_ARCHITECTURE_FEATURES = [
  "Mixture-of-Experts with bounded activated experts per token",
  "Multi-head Latent Attention (MLA)",
  "Multi-Token Prediction (MTP) module for speculative decoding",
  "FP8 block-scaled weights with 128×128 blocks",
  "BF16 conversion workflow for compatible deployments",
  "Tensor and pipeline parallel inference",
] as const;
