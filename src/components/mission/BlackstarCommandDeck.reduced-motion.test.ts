import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const deck=readFileSync(new URL('./BlackstarCommandDeck.jsx',import.meta.url),'utf8');

describe('Blackstar Mission Control reduced-motion contract',()=>{
  it('stops continuous decorative motion instead of merely slowing it down',()=>{
    expect(deck).toContain("animate={reduced ? undefined : { x: ['-120%', '240%'] }}");
    expect(deck).toContain("animate={reduced ? undefined : { x: ['100%', '-120%'] }}");
    expect(deck).toContain("animate={reduced ? undefined : { opacity: [0.35, 1, 0.35] }}");
    expect(deck).toContain("animate={reduced ? undefined : { borderColor:");
    expect(deck).toContain("animate={reduced ? undefined : { opacity: [0.25, 1, 0.25] }}");
    expect(deck).not.toContain('duration: reduced ? 55 : 26');
    expect(deck).not.toContain('duration: reduced ? 4 : 1.8');
  });

  it('disables alert entrance, exit and layout animation under reduced motion',()=>{
    expect(deck).toContain('layout={!reduced}');
    expect(deck).toContain('initial={reduced ? false : { opacity: 0, x: 18 }}');
    expect(deck).toContain('exit={reduced ? undefined : { opacity: 0, x: -14 }}');
    expect(deck).toContain('transition={reduced ? { duration: 0 } : { delay: index * 0.04 }}');
  });
});
