import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const transition=readFileSync(new URL('../../components/visual/PageTransition.jsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
const astra=readFileSync(new URL('../../components/blackstar/blackstar-astra.css',import.meta.url),'utf8');
const neural=readFileSync(new URL('../../components/visual/NeuralSpace.jsx',import.meta.url),'utf8');
const depth=readFileSync(new URL('../../components/blackstar/AstraDepthField.jsx',import.meta.url),'utf8');
const errorState=readFileSync(new URL('../../components/palladium/ErrorState.jsx',import.meta.url),'utf8');
const twoFactor=readFileSync(new URL('../../screens/TwoFactor.jsx',import.meta.url),'utf8');
const aiTools=readFileSync(new URL('../../screens/AIToolsPublic.jsx',import.meta.url),'utf8');
const features=readFileSync(new URL('../../screens/Features.jsx',import.meta.url),'utf8');
const legal=readFileSync(new URL('../../screens/Legal.jsx',import.meta.url),'utf8');
const landing=readFileSync(new URL('../../screens/Landing.jsx',import.meta.url),'utf8');
const sectionReveal=readFileSync(new URL('../../components/site/SectionReveal.jsx',import.meta.url),'utf8');
const featureShowcase=readFileSync(new URL('../../components/site/FeatureShowcase.jsx',import.meta.url),'utf8');

describe('Blackstar final visual accessibility and performance guardrails',()=>{
  it('removes route transition motion when the OS requests reduced motion',()=>{
    expect(transition).toContain('useReducedMotion');
    expect(transition).toContain('initial={reducedMotion ? false');
    expect(transition).toContain("transition={reducedMotion ? { duration: 0 }");
    expect(sectionReveal).toContain('whileInView={reducedMotion ? undefined');
  });

  it('freezes auth, card depth and visual-world ambience under reduced motion',()=>{
    expect(styles).toContain('.blackstar-auth-orb');
    expect(styles).toContain('transition:none !important');
    expect(styles).toContain('transform:none !important');
    expect(styles).toContain('.blackstar-public-page :is(section, article, div)[class*="rounded"][class*="border"]:hover');
    expect(astra).toContain('.blackstar-style-atmosphere::before');
    expect(astra).toContain('.blackstar-style-atmosphere::after');
    expect(astra).toContain('animation: none');
  });

  it('keeps unconfigured two-factor honest instead of simulating verification',()=>{
    expect(twoFactor).toContain('AuthLayout');
    expect(twoFactor).toContain('Two-factor verification is not enabled on this deployment.');
    expect(twoFactor).toContain('will not accept or pretend to verify');
    expect(twoFactor).not.toContain('Verify and continue');
  });

  it('keeps error surfaces cinematic without forcing motion',()=>{
    expect(errorState).toContain('blackstar-error-state');
    expect(errorState).toContain('useReducedMotion');
    expect(errorState).toContain('initial={reducedMotion ? false');
    const agents=readFileSync(new URL('../../screens/AIAgents.jsx',import.meta.url),'utf8');
    expect(agents).toContain('useReducedMotion');
    expect(agents).toContain('blackstar-public-agents');
  });

  it('removes direct public-page Framer Motion when reduced motion is requested',()=>{
    expect(aiTools).toContain('useReducedMotion');
    expect(aiTools).toContain('animate={reducedMotion ? undefined');
    expect(features).toContain('initial={reducedMotion ? false');
    expect(legal).toContain("behavior: reducedMotion ? 'auto' : 'smooth'");
    expect(legal).toContain('initial={reducedMotion ? false');
    expect(landing).toContain('useReducedMotion');
    expect(landing).toContain('initial={reducedMotion ? false');
  });

  it('propagates reduced motion through shared public reveal and showcase components',()=>{
    expect(sectionReveal).toContain('useReducedMotion');
    expect(sectionReveal).toContain('initial={reducedMotion ? false');
    expect(featureShowcase).toContain('MotionConfig');
    expect(featureShowcase).toContain('reducedMotion="user"');
  });

  it('reduces decorative CSS depth on mobile while preserving the scene identity',()=>{
    expect(styles).toContain('.blackstar-orb-c,');
    expect(styles).toContain('.blackstar-auth-orb-b,');
    expect(styles).toContain('.blackstar-depth-rail { display:none; }');
    expect(styles).toContain('.blackstar-style-atmosphere { opacity:.72; }');
  });

  it('keeps canvas ambience bounded on slower devices and when off-screen',()=>{
    expect(depth).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(depth).toContain("window.matchMedia('(max-width: 767px)').matches");
    expect(depth).toContain("navigator.connection?.saveData === true");
    expect(neural).toContain('IntersectionObserver');
    expect(neural).toContain("document.addEventListener('visibilitychange'");
  });
});
