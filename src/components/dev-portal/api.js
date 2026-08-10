import { base44 } from '@/api/base44Client';

// Thin wrapper around base44.functions.invoke for the Developer Platform
// backend functions. base44.functions.invoke returns an axios response; the
// JSON body lives in `res.data`.
async function invoke(name, payload) {
  const res = await base44.functions.invoke(name, payload);
  return res.data ?? res;
}

export const listApiKeys = () => invoke('manageApiKey', { action: 'list' });
export const createApiKey = (name, environment, scopes) => invoke('manageApiKey', { action: 'create', name, environment, scopes });
export const rotateApiKey = (key_id) => invoke('manageApiKey', { action: 'rotate', key_id });
export const revokeApiKey = (key_id) => invoke('manageApiKey', { action: 'revoke', key_id });

export const listWebhooks = () => invoke('manageWebhook', { action: 'list' });
export const createWebhook = (url, events, description) => invoke('manageWebhook', { action: 'create', url, events, description });
export const updateWebhook = (webhook_id, patch) => invoke('manageWebhook', { action: 'update', webhook_id, ...patch });
export const deleteWebhook = (webhook_id) => invoke('manageWebhook', { action: 'delete', webhook_id });
export const testWebhook = (webhook_id) => invoke('manageWebhook', { action: 'test', webhook_id });

export const getApiUsage = () => invoke('getApiUsage', {});