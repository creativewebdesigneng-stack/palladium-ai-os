import { describe, expect, it } from 'vitest';
import { buildPublicSearchQueries } from '../web-access.server';

describe('public web search intent', () => {
  it('keeps normal public web searches broad', () => {
    expect(buildPublicSearchQueries('latest AI research')).toEqual(['latest AI research']);
  });

  it('targets YouTube watch pages first when the operator asks for videos', () => {
    expect(buildPublicSearchQueries('find youtube videos about AI agents')).toEqual([
      'site:youtube.com/watch find youtube videos about AI agents',
      'find youtube videos about AI agents',
    ]);
  });
});
