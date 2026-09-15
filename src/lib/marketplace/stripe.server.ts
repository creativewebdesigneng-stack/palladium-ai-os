import {createStripeClient,getServerStripeEnvironment,verifyWebhook,type StripeEnv} from '@/lib/stripe.server';
export function marketplaceStripe(){return createStripeClient(getServerStripeEnvironment());}
export function marketplaceStripeEnvironment():StripeEnv{return getServerStripeEnvironment();}
export function marketplaceBaseUrl(){const url=process.env.APP_URL||process.env.VITE_APP_URL;if(!url)throw new Error('Marketplace payments require APP_URL.');return url.replace(/\/$/,'');}
export async function verifyMarketplaceWebhook(request:Request){return verifyWebhook(request,getServerStripeEnvironment());}