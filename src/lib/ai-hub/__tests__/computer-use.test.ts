import { describe, expect, it } from 'vitest'
import { buildBlackstarComputerUsePlan } from '../computer-use'

describe('Blackstar Computer Use', () => {
  it('allows bounded read-only browser work without approval', () => {
    const plan = buildBlackstarComputerUsePlan([
      { action: 'navigate', url: 'https://shop.example.com/orders', purpose: 'Open orders' },
      { action: 'read', selector: 'main', purpose: 'Read order status' },
      { action: 'screenshot', purpose: 'Capture evidence' },
    ], { allowedDomains: ['example.com'] })

    expect(plan.executable).toBe(true)
    expect(plan.requiresApproval).toBe(false)
    expect(plan.blockedCount).toBe(0)
  })

  it('requires approval for mutating interactions by default', () => {
    const plan = buildBlackstarComputerUsePlan([
      { action: 'click', selector: '[data-testid="save"]', purpose: 'Save draft changes' },
      { action: 'type', selector: 'textarea[name="note"]', text: 'Customer follow-up prepared' },
    ], { allowedDomains: ['example.com'] })

    expect(plan.executable).toBe(true)
    expect(plan.requiresApproval).toBe(true)
    expect(plan.decisions.every((decision) => decision.requiresApproval)).toBe(true)
  })

  it('blocks navigation outside the domain allow-list', () => {
    const plan = buildBlackstarComputerUsePlan([
      { action: 'navigate', url: 'https://attacker.example.net' },
    ], { allowedDomains: ['example.com'] })

    expect(plan.executable).toBe(false)
    expect(plan.blockedCount).toBe(1)
    expect(plan.decisions[0]?.risk).toBe('blocked')
  })

  it('blocks credentials and payment data from computer-use steps', () => {
    const plan = buildBlackstarComputerUsePlan([
      { action: 'type', selector: '#password', text: 'super-secret' },
      { action: 'fill_form', fields: { 'input[name="cvv"]': '123' } },
    ], { allowedDomains: ['example.com'] })

    expect(plan.executable).toBe(false)
    expect(plan.blockedCount).toBe(2)
  })

  it('keeps browser storage-state access disabled unless explicitly enabled', () => {
    const blocked = buildBlackstarComputerUsePlan([
      { action: 'storage_state' },
    ], { allowedDomains: ['example.com'] })

    const enabled = buildBlackstarComputerUsePlan([
      { action: 'storage_state' },
    ], { allowedDomains: ['example.com'], allowStorageState: true })

    expect(blocked.executable).toBe(false)
    expect(enabled.executable).toBe(true)
    expect(enabled.decisions[0]?.risk).toBe('high')
  })

  it('enforces the configured step ceiling', () => {
    const plan = buildBlackstarComputerUsePlan([
      { action: 'read' },
      { action: 'scroll', direction: 'down' },
      { action: 'read' },
    ], { allowedDomains: ['example.com'], maximumSteps: 2 })

    expect(plan.decisions).toHaveLength(2)
  })
})
