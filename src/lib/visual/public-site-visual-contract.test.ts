import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const atmospherePages=[
  ['AIAgents.jsx','blackstar-public-agents'],
  ['Features.jsx','blackstar-public-features'],
  ['Business.jsx','blackstar-public-business'],
  ['Developers.jsx','blackstar-public-developers'],
  ['Resources.jsx','blackstar-public-resources'],
  ['HelpCentre.jsx','blackstar-public-help'],
  ['Legal.jsx','blackstar-public-legal'],
  ['Onboarding.jsx','blackstar-public-onboarding'],
  ['Payment.jsx','blackstar-public-payment'],
] as const;

const bespokePages=[
  ['Landing.jsx','blackstar-public-landing'],
  ['Pricing.jsx','blackstar-public-pricing'],
  ['AIToolsPublic.jsx','blackstar-public-tools'],
] as const;

describe('Blackstar public visual coverage',()=>{
  it('keeps every major public surface on a named Blackstar visual treatment',()=>{
    for(const [file,variant] of [...atmospherePages,...bespokePages]){
      const source=readFileSync(new URL(`../../screens/${file}`,import.meta.url),'utf8');
      expect(source).toContain('blackstar-public-page');
      expect(source).toContain(variant);
    }
  });

  it('defines a distinct shared atmosphere for pages that use the public variant layer',()=>{
    const css=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
    for(const [,variant] of atmospherePages){
      expect(css).toContain(`.${variant}::before`);
    }
  });

  it('preserves established bespoke backgrounds for landing, pricing and tools',()=>{
    const landing=readFileSync(new URL('../../screens/Landing.jsx',import.meta.url),'utf8');
    const pricing=readFileSync(new URL('../../screens/Pricing.jsx',import.meta.url),'utf8');
    const tools=readFileSync(new URL('../../screens/AIToolsPublic.jsx',import.meta.url),'utf8');
    expect(landing).toContain('NeuralSpace');
    expect(pricing).toContain('NeuralNetworkBackground');
    expect(tools).toContain('blackstar-public-tools');
  });

  it('keeps auth on its dedicated cinematic space rather than flattening it into public cards',()=>{
    const auth=readFileSync(new URL('../../components/AuthLayout.jsx',import.meta.url),'utf8');
    expect(auth).toContain('blackstar-auth-space');
    expect(auth).toContain('SpaceBackground');
  });
});
