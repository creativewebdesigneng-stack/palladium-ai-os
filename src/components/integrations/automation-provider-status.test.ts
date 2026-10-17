import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AutomationProviderStatusBadge from './AutomationProviderStatusBadge';

describe('automation provider status presentation', () => {
  it.each([
    [{ loading: true, provider: { configured: true } }, 'Checking…'],
    [{ error: true, provider: { configured: true } }, 'Status unavailable'],
    [{}, 'Status unavailable'],
    [{ provider: { configured: true, state: 'adapter_required' } }, 'Adapter required'],
    [{ provider: { configured: false, state: 'adapter_required' } }, 'Adapter required'],
    [{ provider: { configured: false } }, 'Needs connection'],
  ])('does not render a healthy provider for missing, failed or unsupported status: %j', (props, label) => {
    const markup = renderToStaticMarkup(createElement(AutomationProviderStatusBadge, props));
    expect(markup).toContain(label);
    expect(markup).not.toContain('text-emerald');
    expect(markup).not.toContain('Settings present');
  });

  it('labels valid configuration without claiming a live health check', () => {
    const markup = renderToStaticMarkup(createElement(AutomationProviderStatusBadge, { provider: { configured: true } }));
    expect(markup).toContain('Settings present');
    expect(markup).not.toContain('Connected');
  });
});
