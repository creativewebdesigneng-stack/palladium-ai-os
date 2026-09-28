import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const pages=[
  ['Landing.jsx','blackstar-public-landing'],
  ['Pricing.jsx','blackstar-public-pricing'],
  ['AIToolsPublic.jsx','blackstar-public-tools'],
  ['Features.jsx','blackstar-public-features'],
  ['Business.jsx','blackstar-public-business'],
  ['Developers.jsx','blackstar-public-developers'],
  ['Resources.jsx','blackstar-public-resources'],
  ['HelpCentre.jsx','blackstar-public-help'],
  ['Legal.jsx','blackstar-public-legal'],
  ['Onboarding.jsx','blackstar-public-onboarding'],
  ['Payment.jsx','blackstar-public-payment'],
] as const;

describe('Blackstar public visual coverage',()=>{
  it('keeps every major public information surface on the shared spatial shell',()=>{
    for(const [file,variant] of pages){
      const source=readFileSync(new URL(`../../screens/${file}`,import.meta.url),'utf8');
      expect(source).toContain('blackstar-public-page');
      expect(source).toContain(variant);
    }
  });

  it('defines a distinct atmosphere for every public page variant',()=>{
    const css=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
    for(const [,variant] of pages){
      expect(css).toContain(`.${variant}::before`);
    }
  });

  it('keeps auth on its dedicated cinematic space rather than flattening it into public cards',()=>{
    const auth=readFileSync(new URL('../../components/AuthLayout.jsx',import.meta.url),'utf8');
    expect(auth).toContain('blackstar-auth-space');
    expect(auth).toContain('SpaceBackground');
    const twoFactor=readFileSync(new URL('../../screens/TwoFactor.jsx',import.meta.url),'utf8');
    expect(twoFactor).toContain("import AuthLayout from '@/components/AuthLayout'");
    expect(twoFactor).toContain('<AuthLayout');
  });
});
