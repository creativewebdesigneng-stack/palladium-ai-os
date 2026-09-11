import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260911213000_game_foundry_private_uploads.sql','utf8')
const functions = readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const uploader = readFileSync('src/lib/game-foundry/uploadGameFoundrySource.js','utf8')

describe('Game Foundry private upload contract', () => {
  it('creates a private owner-prefixed storage bucket', () => {
    expect(migration).toContain("values ('game-foundry', 'game-foundry', false")
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text")
    expect(migration).toContain('to authenticated')
  })

  it('keeps uploaded sources private and passes workers only signed URLs', () => {
    expect(uploader).toContain('.from("game-foundry").upload')
    expect(uploader).not.toContain('getPublicUrl')
    expect(functions).toContain('.createSignedUrl(data.storagePath, 300)')
    expect(functions).toContain('source_storage_path:data.storagePath ?? null')
  })

  it('rejects cross-account storage paths before signing', () => {
    expect(functions).toContain('data.storagePath.startsWith(expectedPrefix)')
    expect(functions).toContain('Uploaded source path is not owned by this account.')
  })
})
