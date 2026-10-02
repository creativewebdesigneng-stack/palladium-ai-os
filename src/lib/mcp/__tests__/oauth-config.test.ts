import { describe, expect, it } from 'vitest'
import {
  BLACKSTAR_PRODUCTION_SUPABASE_PROJECT_REF,
  projectRefFromSupabaseUrl,
  resolveMcpSupabaseProjectRef,
} from '../oauth-config'

describe('Blackstar MCP OAuth project-ref resolution', () => {
  it('prefers an explicit valid project ref', () => {
    expect(resolveMcpSupabaseProjectRef({
      explicitProjectRef: 'abcdefghi123',
      supabaseUrl: 'https://otherproject.supabase.co',
    })).toBe('abcdefghi123')
  })

  it('derives the project ref from a valid Supabase URL', () => {
    expect(projectRefFromSupabaseUrl('https://piwhiuangitqvwvwwcga.supabase.co'))
      .toBe('piwhiuangitqvwvwwcga')
    expect(resolveMcpSupabaseProjectRef({
      supabaseUrl: 'https://piwhiuangitqvwvwwcga.supabase.co',
      fallbackProjectRef: 'fallback123',
    })).toBe('piwhiuangitqvwvwwcga')
  })

  it('uses the current public production project ref instead of an empty-host issuer fallback', () => {
    expect(resolveMcpSupabaseProjectRef({}))
      .toBe(BLACKSTAR_PRODUCTION_SUPABASE_PROJECT_REF)
    expect(BLACKSTAR_PRODUCTION_SUPABASE_PROJECT_REF).toBe('piwhiuangitqvwvwwcga')
  })

  it('does not derive a ref from unrelated or malformed hosts', () => {
    expect(projectRefFromSupabaseUrl('https://example.com')).toBeNull()
    expect(projectRefFromSupabaseUrl('not-a-url')).toBeNull()
  })
})
