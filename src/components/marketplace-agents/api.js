import { base44 } from '@/api/base44Client';

// Thin wrapper around base44.functions.invoke for the marketplace backend
// functions. base44.functions.invoke returns an axios response; the JSON body
// lives in `res.data` (fall back to `res` for older SDK behaviour).
async function invoke(name, payload) {
  const res = await base44.functions.invoke(name, payload);
  return res.data ?? res;
}

export const saveMarketplaceAgent = (payload) => invoke('saveMarketplaceAgent', payload);
export const submitMarketplaceAgent = (payload) => invoke('submitMarketplaceAgent', payload);
export const reviewMarketplaceAgent = (payload) => invoke('reviewMarketplaceAgent', payload);
export const removeMarketplaceAgent = (payload) => invoke('removeMarketplaceAgent', payload);
export const rateMarketplaceAgent = (payload) => invoke('rateMarketplaceAgent', payload);
export const getCreatorStats = (userId) => invoke('getCreatorStats', { user_id: userId });