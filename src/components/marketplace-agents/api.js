// Marketplace client API — thin wrappers around the typed RPC layer.
// Every call is authenticated server-side; no mock data and no Base44.
import {
  listMarketplaceAgents,
  listMyListings,
  listCreatorListings,
  saveMarketplaceAgent as saveFn,
  submitMarketplaceAgent as submitFn,
  removeMarketplaceAgent as removeFn,
  reviewMarketplaceAgent as reviewFn,
  listReviewQueue,
  installMarketplaceAgent as installFn,
  rateMarketplaceAgent as rateFn,
  getCreatorStats as statsFn,
} from "@/lib/marketplace/marketplace.functions";
import {
  getCreatorProfile as getProfileFn,
  saveCreatorProfile as saveProfileFn,
} from "@/lib/marketplace/creators.functions";

export const listPublishedAgents = (category, limit) =>
  listMarketplaceAgents({ data: { category, limit } });
export const listOwnListings = () => listMyListings({ data: {} });
export const listAgentsByCreator = (creatorId) =>
  listCreatorListings({ data: { creator_id: creatorId } });

export const saveMarketplaceAgent = (payload) => saveFn({ data: payload });
export const submitMarketplaceAgent = (payload) => submitFn({ data: payload });
export const removeMarketplaceAgent = (payload) => removeFn({ data: payload });
export const reviewMarketplaceAgent = (payload) => reviewFn({ data: payload });
export const listPendingListings = (status) => listReviewQueue({ data: { status } });
export const installMarketplaceAgent = (payload) => installFn({ data: payload });
export const rateMarketplaceAgent = (payload) => rateFn({ data: payload });
export const getCreatorStats = (userId) => statsFn({ data: { creator_id: userId ?? null } });

export const getCreatorProfile = (userId) => getProfileFn({ data: { user_id: userId ?? null } });
export const saveCreatorProfile = (payload) => saveProfileFn({ data: payload });
