export const LTX23_MODEL = 'fal-ai/ltx-2.3/image-to-video'
export function ltx23ProviderDuration(seconds:number){const n=Math.max(1,Math.round(seconds));return n<=6?6:n<=8?8:10}
