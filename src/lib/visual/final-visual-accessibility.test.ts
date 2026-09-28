import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const transition=readFileSync(new URL('../../components/visual/PageTransition.jsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
const astra=readFileSync(new URL('../../components/blackstar/blackstar-astra.css',import.meta.url),'utf8');
const neural=readFileSync(new URL('../../components/visual/NeuralSpace.jsx',import.meta.url),'utf8');
const depth=readFileSync(new URL('../../components/blackstar/AstraDepthField.jsx',import.meta.url),'utf8');

describe('Blackstar final visual accessibility and performance guardrails',()=>{
  it('removes route transition motion when the OS requests reduced motion',()=>{
    expect(transition).toContain('useReducedMotion');
    expect(transition).toContain('initial={reducedMotion ? false');
    expect(transition).toContain("transition={reducedMotion ? { duration: 0 }");
  });

  it('freezes auth, card depth and visual-world ambience under reduced motion',()=>{
    expect(styles).toContain('.blackstar-auth-orb');
    expect(styles).toContain('transition:none !important');
    expect(styles).toContain('transform:none !important');
    expect(astra).toContain('.blackstar-style-atmosphere::before');
    expect(astra).toContain('.blackstar-style-atmosphere::after');
    expect(astra).toContain('animation: none');
  });

  it('keeps canvas ambience bounded on slower devices and when off-screen',()=>{
    expect(depth).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(depth).toContain("window.matchMedia('(max-width: 767px)').matches");
    expect(depth).toContain("navigator.connection?.saveData === true");
    expect(neural).toContain('IntersectionObserver');
    expect(neural).toContain("document.addEventListener('visibilitychange'");
  });
});
