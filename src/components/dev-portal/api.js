// Developer Platform client — calls the authenticated typed RPC layer directly.
// No mock data: every value here comes from the caller's own workspace.
import {
  listApiKeysFn,
  createApiKeyFn,
  rotateApiKeyFn,
  revokeApiKeyFn,
  listWebhooksFn,
  createWebhookFn,
  updateWebhookFn,
  deleteWebhookFn,
  testWebhookFn,
  getApiUsageFn,
} from "@/lib/devapi/devapi.functions";

export const listApiKeys = () => listApiKeysFn();
export const createApiKey = (name, environment, scopes) =>
  createApiKeyFn({ data: { name, environment, scopes } });
export const rotateApiKey = (key_id) => rotateApiKeyFn({ data: { key_id } });
export const revokeApiKey = (key_id) => revokeApiKeyFn({ data: { key_id } });

export const listWebhooks = () => listWebhooksFn();
export const createWebhook = (url, events, description) =>
  createWebhookFn({ data: { url, events, description } });
export const updateWebhook = (webhook_id, patch) =>
  updateWebhookFn({ data: { webhook_id, ...patch } });
export const deleteWebhook = (webhook_id) => deleteWebhookFn({ data: { webhook_id } });
export const testWebhook = (webhook_id) => testWebhookFn({ data: { webhook_id } });

export const getApiUsage = () => getApiUsageFn();
