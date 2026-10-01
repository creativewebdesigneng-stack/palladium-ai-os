import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

const registrySource = readFileSync(
  new URL('../../components/palladium/navigationData.jsx', import.meta.url),
  'utf8',
)
const sidebarSource = readFileSync(
  new URL('../../components/palladium/Sidebar.jsx', import.meta.url),
  'utf8',
)
const commandSource = readFileSync(
  new URL('../../components/palladium/CommandMenu.jsx', import.meta.url),
  'utf8',
)

function registeredPaths(): string[] {
  return [...registrySource.matchAll(/path:\s*'([^']+)'/g)]
    .map((match) => match[1])
    .filter((path): path is string => typeof path === 'string' && path.length > 0)
}

function routeRootFromFile(name: string) {
  const stem = name.replace(/\.tsx$/, '')
  const segments = stem.split('.').filter((segment) => segment !== 'index')
  return '/' + segments.map((segment) => segment.startsWith('$') ? 'example' : segment).join('/')
}

describe('Blackstar command-first navigation', () => {
  it('keeps registry paths unique', () => {
    const paths = registeredPaths()
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('keeps every static authenticated app route reachable through the unified registry', () => {
    const routeDir = new URL('../../routes/_shell/_app/', import.meta.url)
    const roots = [...new Set(
      readdirSync(routeDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
        .map((entry) => routeRootFromFile(entry.name)),
    )]

    const paths = registeredPaths()
    const missing = roots
      .filter((route) => !route.includes('/example'))
      .filter((route) => !paths.some((path) =>
        route === path || route.startsWith(path + '/') || path.startsWith(route + '/'),
      ))
      .sort()

    expect(missing).toEqual([])
  })

  it('uses a small permanent command set and expandable system groups', () => {
    const primaryBlock = registrySource.match(/export const PRIMARY_NAV = \[([\s\S]*?)\n\]/)?.[1] ?? ''
    const primaryPaths = [...primaryBlock.matchAll(/path:\s*'([^']+)'/g)]
    expect(primaryPaths.length).toBeLessThanOrEqual(8)
    expect(sidebarSource).toContain('<SystemGroup')
    expect(sidebarSource).toContain('Find anything in Blackstar')
    expect(sidebarSource).toContain('openCommand')
  })

  it('makes the command palette search the complete navigation registry', () => {
    expect(commandSource).toContain('ALL_NAV_ITEMS')
    expect(commandSource).toContain("q ? ALL_NAV_ITEMS : PRIMARY_NAV")
    expect(commandSource).toContain('Your workspace')
  })
})
