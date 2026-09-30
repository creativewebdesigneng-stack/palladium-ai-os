import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('public route SSR safety', () => {
  it('defers email-verification browser query parsing until after mount', () => {
    const file = source('../../screens/EmailVerification.jsx');

    expect(file).toContain("import { useEffect, useState } from 'react';");
    expect(file).toContain('useEffect(() => {');
    expect(file).toContain("setEmail(params.get('email') || '')");
    expect(file.indexOf('useEffect(() => {')).toBeLessThan(file.indexOf('window.location.search'));
  });

  it('defers payment browser query parsing until after mount', () => {
    const file = source('../../screens/Payment.jsx');

    expect(file).toContain("import { useEffect, useState } from 'react';");
    expect(file).toContain("useState({ planId: 'pro', billing: 'monthly' })");
    expect(file).toContain('setSelection({');
    expect(file.indexOf('useEffect(() => {')).toBeLessThan(file.indexOf('window.location.search'));
  });
});
