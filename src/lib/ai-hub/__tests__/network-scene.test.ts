import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('../../../screens/AIHub.jsx', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../../../components/ai-hub/AiHubNetworkScene.jsx', import.meta.url), 'utf8');

describe('AI Hub live network scene', () => {
  it('uses the existing Hub inventory and provider registry', () => {
    expect(screen).toContain("import AiHubNetworkScene from '@/components/ai-hub/AiHubNetworkScene'");
    expect(screen).toContain('resources={inventory.data?.resources ?? []}');
    expect(screen).toContain('providers={providers}');
    expect(scene).toContain("Motion represents live or available state only and never implies execution.");
  });

  it('shows only bounded live resource kinds and respects reduced motion', () => {
    expect(scene).toContain("['model','agent','workflow','dataset','compute','mcp']");
    expect(scene).toContain('useReducedMotion');
    expect(scene).toContain('reduced || !live ? undefined');
  });

  it('provides a mobile fallback instead of requiring the desktop spatial layout', () => {
    expect(scene).toContain('md:hidden');
    expect(scene).toContain('No live topology nodes are available yet.');
  });
});
