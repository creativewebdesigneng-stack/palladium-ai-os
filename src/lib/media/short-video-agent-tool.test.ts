import { describe, expect, it } from 'vitest';
import { SHORT_VIDEO_TOOL_DEF } from './short-video-agent-tool.server';

describe('short-video agent tool', () => {
  it('exposes only bounded lifecycle actions', () => {
    expect(SHORT_VIDEO_TOOL_DEF.name).toBe('short_video');
    const action = (SHORT_VIDEO_TOOL_DEF.parameters as any).properties.action;
    expect(action.enum).toEqual(['capabilities', 'list', 'create', 'status']);
  });

  it('does not accept credentials or server paths', () => {
    const properties = Object.keys((SHORT_VIDEO_TOOL_DEF.parameters as any).properties);
    expect(properties).not.toContain('api_key');
    expect(properties).not.toContain('token');
    expect(properties).not.toContain('path');
    expect(properties).not.toContain('command');
  });
});
