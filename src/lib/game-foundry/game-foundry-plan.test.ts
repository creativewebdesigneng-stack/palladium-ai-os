import { describe, expect, it } from 'vitest'
import { parseGameFoundryDesign } from './game-foundry-plan.server'

const valid = {
  concept: 'A cooperative third-person science-fiction survival game focused on exploration and recovery.',
  coreLoop: ['Explore hostile zones', 'Recover resources', 'Upgrade gear', 'Return to safety'],
  playerExperience: ['Readable combat', 'Meaningful exploration'],
  gameplaySystems: ['Inventory and crafting', 'Enemy AI', 'Quest progression'],
  worldAndLevels: ['Hub area', 'Procedural mission zones'],
  charactersAndAI: ['Playable survivor', 'Hostile drones'],
  assetPlan: ['Modular environment kit', 'Character set', 'Weapons'],
  technicalPlan: ['Target stable 60 FPS', 'Use pooled effects and LODs'],
  engineSetup: ['Create a clean gameplay module structure'],
  milestones: ['Greybox vertical slice', 'Combat/content pass'],
  acceptanceCriteria: ['Playable start-to-finish vertical slice', 'No blocking runtime errors'],
}

describe('Game Foundry design compiler', () => {
  it('accepts the strict game design shape', () => {
    const parsed = parseGameFoundryDesign(JSON.stringify(valid))
    expect(parsed.coreLoop).toHaveLength(4)
    expect(parsed.concept).toContain('science-fiction')
  })

  it('accepts fenced JSON but rejects incomplete designs', () => {
    expect(parseGameFoundryDesign('```json\n'+JSON.stringify(valid)+'\n```').assetPlan).toHaveLength(3)
    expect(() => parseGameFoundryDesign(JSON.stringify({ concept: valid.concept }))).toThrow('incomplete')
  })

  it('rejects non-JSON model output', () => {
    expect(() => parseGameFoundryDesign('Here is your game design')).toThrow('invalid JSON')
  })
})
