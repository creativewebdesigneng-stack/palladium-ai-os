import { describe, expect, it } from 'vitest'
import { buildBlackstarAstraRunCapabilityControl } from '../blackstar-astra-capability-control'

describe('Blackstar Astra run capability control', () => {
  it('reports computer use and research only from already granted tools', () => {
    const control = buildBlackstarAstraRunCapabilityControl(['browser_task', 'web_search'])
    expect(control.available).toContain('computer_use')
    expect(control.available).toContain('research')
    expect(control.available).toContain('browsing')
    expect(control.available).toContain('tool_use')
  })

  it('does not claim unimplemented multimodal or vision capabilities', () => {
    const control = buildBlackstarAstraRunCapabilityControl(['browser_task', 'html_studio'])
    expect(control.unavailable_target_capabilities).toContain('vision')
    expect(control.unavailable_target_capabilities).toContain('multimodal_input')
    expect(control.available).not.toContain('vision' as never)
  })

  it('does not manufacture external integration capability without a granted integration tool', () => {
    const control = buildBlackstarAstraRunCapabilityControl(['calculator'])
    expect(control.available).not.toContain('external_integrations')
  })

  it('maps Blackstar creation tools to coding and artifact capabilities', () => {
    const control = buildBlackstarAstraRunCapabilityControl(['github_write', 'app_studio'])
    expect(control.available).toContain('coding')
    expect(control.available).toContain('artifact_creation')
    expect(control.available).toContain('external_integrations')
  })
})
