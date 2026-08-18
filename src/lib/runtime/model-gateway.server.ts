import * as base from "./model-gateway.base";
import type { ChatMessage, ChatResult, Provider, RunArgs } from "./model-gateway.base";

export * from "./model-gateway.base";

type ActiveProvider = { provider: Provider; model: string };

// A single personal/runtime conversation reuses the same messages array across
// tool rounds. Remember a successful fallback for that array so a provider that
// has already failed is not retried on every subsequent model turn.
const activeProviderByConversation = new WeakMap<ChatMessage[], ActiveProvider>();

function providerConfigured(provider: Provider): boolean {
  if (provider === "groq") return Boolean(process.env["GROQ_API_KEY"]);
  if (provider === "openai") return Boolean(process.env["OPENAI_API_KEY"]);
  if (provider === "anthropic") return Boolean(process.env["ANTHROPIC_API_KEY"]);
  if (provider === "lovable") return Boolean(process.env["LOVABLE_API_KEY"]);
  return Boolean(process.env["OPENAI_COMPATIBLE_BASE_URL"]);
}

function fallbackOrder(primary: Provider): Provider[] {
  const ordered: Provider[] = [primary, "groq", "openai", "lovable", "anthropic", "compatible"];
  return ordered.filter(
    (provider, index) =>
      ordered.indexOf(provider) === index && (provider === primary || providerConfigured(provider)),
  );
}

/**
 * Non-streaming model calls get bounded cross-provider failover.
 *
 * Each underlying provider still owns its normal retry/backoff policy. Only
 * after that provider has definitively failed do we move to another configured
 * provider. Cancellation is never retried or failed over.
 */
export async function runChat(args: RunArgs): Promise<ChatResult> {
  const remembered = activeProviderByConversation.get(args.messages);
  const primaryProvider = remembered?.provider ?? args.provider;
  const primaryModel = remembered?.model ?? args.model;
  let lastError: unknown;

  for (const provider of fallbackOrder(primaryProvider)) {
    const model =
      provider === primaryProvider
        ? primaryModel
        : base.resolveModel(provider, null);
    try {
      const result = await base.runChat({ ...args, provider, model });
      activeProviderByConversation.set(args.messages, {
        provider: result.provider,
        model: result.model,
      });
      return result;
    } catch (error) {
      if (error instanceof base.ProviderError && error.status === 499) throw error;
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new base.ProviderError("No configured AI provider could complete the request.", 503, false);
}
