import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
const atmosphereVariants=[
  'blackstar-public-agents',
  'blackstar-public-features',
  'blackstar-public-business',
  'blackstar-public-developers',
  'blackstar-public-resources',
  'blackstar-public-help',
  'blackstar-public-legal',
  'blackstar-public-onboarding',
  'blackstar-public-payment',
  'blackstar-public-error',
] as const;

describe('Blackstar public atmosphere selector uniqueness',()=>{
  it('defines each shared public atmosphere exactly once',()=>{
    for(const variant of atmosphereVariants){
      const matches=css.match(new RegExp(`\\.${variant}::before\\s*\\{`,'g')) ?? [];
      expect(matches,variant).toHaveLength(1);
    }
  });
});
