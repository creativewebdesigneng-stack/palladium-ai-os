import { describe, expect, it } from 'vitest';
import { gameFoundryAssetErrorMessage, validateGameFoundryAssetInput } from './game-foundry-asset-errors.js';

describe('Game Foundry asset submission diagnostics', () => {
  it('surfaces the stage when a long or unexpected error would otherwise become generic', () => {
    const longError = new Error('Technical validation details '.repeat(15));
    expect(gameFoundryAssetErrorMessage(longError, 'upload')).toMatch(/upload failed before/);
    expect(gameFoundryAssetErrorMessage(longError, 'submit')).toMatch(/could not create or submit/);
    expect(gameFoundryAssetErrorMessage(longError, 'prepare')).toMatch(/could not prepare/);
  });

  it('preserves short curated provider errors rather than hiding them', () => {
    const err = new Error('FAL has blocked 3D generation because the account needs billing attention.');
    expect(gameFoundryAssetErrorMessage(err, 'submit')).toMatch(/billing attention/);
  });

  it('does not expose long technical data or tokens in the UI', () => {
    const err = new Error('sensitive-secret-123 '.repeat(30));
    expect(gameFoundryAssetErrorMessage(err, 'submit')).not.toMatch(/sensitive-secret/);
  });

  it('rejects an invalid public source URL before contacting the server', () => {
    expect(() => validateGameFoundryAssetInput({
      inputName: 'Car', sourceKind: 'image', sourceUrl: 'https://', sourceFile: null,
    })).toThrow(/valid public HTTP or HTTPS/);
  });

  it('rejects unsupported uploaded file type and size with actionable messages', () => {
    expect(() => validateGameFoundryAssetInput({
      inputName: 'Car', sourceKind: 'image', sourceUrl: '', sourceFile: { name: 'car.glb', size: 1024 },
    })).toThrow(/file type/);
    expect(() => validateGameFoundryAssetInput({
      inputName: 'Car', sourceKind: 'image', sourceUrl: '', sourceFile: { name: 'car.png', size: 110 * 1024 * 1024 },
    })).toThrow(/100 MB/);
  });

  it('allows a valid public image URL and prompt input', () => {
    expect(() => validateGameFoundryAssetInput({
      inputName: 'Car', sourceKind: 'image', sourceUrl: 'https://images.example.com/car.png',
    })).not.toThrow();
    expect(() => validateGameFoundryAssetInput({
      inputName: 'Car', sourceKind: 'prompt', prompt: 'A detailed sports car.',
    })).not.toThrow();
  });
});
