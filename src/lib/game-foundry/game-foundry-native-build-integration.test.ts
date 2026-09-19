import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const runtime=readFileSync('src/lib/game-foundry/game-foundry-runtime.server.ts','utf8')
const screen=readFileSync('src/screens/GameFoundry.jsx','utf8')

describe('Game Foundry native build integration',()=>{
  it('uses the existing content, source and package compilers when no external game worker exists',()=>{
    expect(functions).toContain('compileNativeGameFoundryBuild')
    expect(functions).toContain('generateGameFoundryContent')
    expect(functions).toContain('compileGameFoundrySourceManifest')
    expect(functions).toContain('buildGameFoundryProjectPackage')
    expect(functions).toContain('buildGameFoundryExportManifest')
    expect(functions).toContain('blackstar-native-game-compiler')
  })

  it('keeps the external game worker as an optional execution lane',()=>{
    expect(runtime).toContain('externalWorkerConfigured: Boolean(gameWorker)')
    expect(functions).toContain('if(!externalWorkerConfigured)')
    expect(functions).toContain('submitGameFoundryProject')
  })

  it('does not claim native engine binaries were compiled',()=>{
    expect(screen).toContain('without pretending engine binaries were built')
    expect(screen).toContain('External executable build worker')
    expect(screen).toContain('Blackstar game project package compiled')
  })
})
