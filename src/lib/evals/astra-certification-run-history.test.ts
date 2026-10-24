import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Astra history retrieval is scoped before limits are applied', () => {
  it('applies the exact server-verified Astra task/suite/model predicate in Postgres', () => {
    const source = readFileSync(new URL('./astra-evaluation-verifier.server.ts', import.meta.url), 'utf8')
    const query = source.slice(source.indexOf('const data = await collectAstraCertificationRunPages'), source.indexOf('const tagged = data.filter'))
    expect(query).toContain(".contains('metadata', {")
    for (const expected of ['server_verified: true', 'suite_id: suiteId', 'task_class: scope.taskClass', "provider: 'compatible'", 'model,']) {
      expect(query).toContain(expected)
    }
    expect(query).toContain('.range(from, to)')
    expect(query).toContain(".order('id', { ascending: false })")
    expect(query).not.toContain('.limit(200)')
  })
})
