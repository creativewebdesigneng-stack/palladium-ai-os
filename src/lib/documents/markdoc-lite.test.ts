import { describe, expect, it } from 'vitest';
import { transformMarkdocPreview } from './markdoc-lite';

describe('transformMarkdocPreview', () => {
  it('converts supported callout and badge tags to ordinary markdown', () => {
    const result = transformMarkdocPreview('{% callout type="warning" %}Be careful{% /callout %}\n{% badge text="Beta" %}');
    expect(result.markdown).toContain('**WARNING**');
    expect(result.markdown).toContain('**[Beta]**');
    expect(result.tags).toEqual(['badge', 'callout']);
  });

  it('leaves unsupported tags visible instead of executing them', () => {
    const source = '{% custom dangerous="true" %}hello{% /custom %}';
    expect(transformMarkdocPreview(source).markdown).toBe(source);
  });

  it('escapes markdown controls supplied through supported attributes', () => {
    const result = transformMarkdocPreview('{% badge text="*unsafe*" %}');
    expect(result.markdown).toContain('\\*unsafe\\*');
  });
});
