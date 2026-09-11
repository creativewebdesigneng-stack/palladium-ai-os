import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const screen=readFileSync('src/screens/GameFoundry.jsx','utf8')
const component=readFileSync('src/components/game-foundry/GameFoundryWebPreview.jsx','utf8')
const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')

describe('Game Foundry playable preview integration',()=>{
  it('renders web previews only from generated source',()=>{
    expect(screen).toContain("project.target_engine==='web'&&project.source_status==='generated'")
  })
  it('keeps the iframe sandboxed and strips ambient referrer access',()=>{
    expect(component).toContain('sandbox="allow-scripts"')
    expect(component).toContain('referrerPolicy="no-referrer"')
  })
  it('guides generated web games away from remote dependencies',()=>{
    expect(functions).toContain('Always include index.html')
    expect(functions).toContain('network-blocked sandboxed preview')
  })
})
