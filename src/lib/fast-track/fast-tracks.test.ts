import { describe, expect, it } from 'vitest';
import { FAST_TRACKS, getFastTrack } from './fast-tracks';

const sectionKeys = ['quickActions', 'agents', 'tools', 'workflows', 'skills', 'integrations', 'setup'] as const;

describe('Fast Track registry', () => {
  it('ships the six launch tracks with stable unique ids', () => {
    expect(FAST_TRACKS).toHaveLength(6);
    expect(new Set(FAST_TRACKS.map((track) => track.id)).size).toBe(FAST_TRACKS.length);
    expect(FAST_TRACKS.map((track) => track.id)).toEqual([
      'gaming',
      'business',
      'enterprise',
      'ecommerce',
      'social-media',
      'app-development',
    ]);
  });

  it('keeps every track useful and routes users into existing PalladiumAI surfaces', () => {
    for (const track of FAST_TRACKS) {
      expect(track.name.length).toBeGreaterThan(2);
      expect(track.description.length).toBeGreaterThan(20);

      const itemIds: string[] = [];
      for (const key of sectionKeys) {
        expect(track[key].length).toBeGreaterThan(0);
        for (const item of track[key]) {
          itemIds.push(item.id);
          expect(item.href).toMatch(/^\/[a-z0-9-]+$/);
          expect(item.href).not.toBe('/fast-track');
          expect(item.description.length).toBeGreaterThan(10);
        }
      }
      expect(new Set(itemIds).size).toBe(itemIds.length);
    }
  });

  it('resolves a known track and rejects unknown ids', () => {
    expect(getFastTrack('gaming')?.name).toBe('Gaming');
    expect(getFastTrack('missing')).toBeNull();
  });
});
