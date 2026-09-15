import Stripe from 'stripe';
export function marketplaceStripe(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('Marketplace payments require STRIPE_SECRET_KEY.');return new Stripe(key);}
export function marketplaceBaseUrl(){const url=process.env.APP_URL||process.env.VITE_APP_URL;if(!url)throw new Error('Marketplace payments require APP_URL.');return url.replace(/\/$/,'');}
export const marketplaceWebhookSecret=()=>{const v=process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET;if(!v)throw new Error('Marketplace payments require STRIPE_MARKETPLACE_WEBHOOK_SECRET.');return v;};