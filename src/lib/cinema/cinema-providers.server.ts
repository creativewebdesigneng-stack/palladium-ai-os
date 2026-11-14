import { getGenerativeMediaCapabilities } from '@/lib/media/generative-media.server'

export function getCinemaGenerationLanes() {
  const media = getGenerativeMediaCapabilities()
  const seedreamLive = media.seedream.provider === 'direct' || media.seedream.provider === 'worker'
  const ltxLive = media.ltx.provider === 'direct' || media.ltx.provider === 'worker'
  return {
    seedream: {
      ...media.seedream,
      configured: seedreamLive,
      provider: seedreamLive ? media.seedream.provider : 'unconfigured',
      disabledReason: seedreamLive ? null : 'Keyframe generation is off until FAL_KEY or SEEDREAM_WORKER_URL is set.',
    },
    ltx: {
      ...media.ltx,
      configured: ltxLive,
      provider: ltxLive ? media.ltx.provider : 'unconfigured',
      disabledReason: ltxLive ? null : 'Video generation is off until FAL_KEY or LTX_WORKER_URL is set. The ffmpeg worker only assembles videos that already exist.',
    },
  }
}

export function assertCinemaGenerationLane(provider: 'seedream' | 'ltx') {
  const lane = getCinemaGenerationLanes()[provider]
  if (!lane.configured) throw new Error(lane.disabledReason ?? 'This cinema generation lane is not configured.')
}
