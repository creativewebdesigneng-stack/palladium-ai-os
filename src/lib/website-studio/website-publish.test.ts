import {describe,expect,it} from 'vitest';
import {assessPublishReadiness} from './website-publish';

const base={name:'Site',slug:'site',html:'<html><body></body></html>',css:'',pages:[{path:'/'}],qualityScore:90,saved:true};
const auth={enabled:true,providers:['email'],supabaseUrl:'https://site-project.supabase.co',publishableKey:'sb_publishable_123456789012345678901234567890'};

describe('publish readiness',()=>{
  it('is ready for a saved static site that clears quality',()=>{
    expect(assessPublishReadiness(base).ready).toBe(true);
  });

  it('allows provisioned public forms and published CMS collections',()=>{
    const result=assessPublishReadiness({
      ...base,
      appConfig:{forms:[{name:'Contact'}],collections:[{name:'Blog Posts'}]},
    });
    expect(result.ready).toBe(true);
    expect(result.checks.find(check=>check.id==='backend')?.ok).toBe(true);
  });

  it('allows generated-site authentication only after its site-scoped runtime is provisioned',()=>{
    const ready=assessPublishReadiness({...base,appConfig:{auth}});
    expect(ready.ready).toBe(true);
    expect(ready.checks.find(check=>check.id==='backend')?.ok).toBe(true);

    const blocked=assessPublishReadiness({...base,appConfig:{auth:{enabled:true,providers:['email']}}});
    expect(blocked.ready).toBe(false);
    expect(blocked.checks.find(check=>check.id==='backend')?.ok).toBe(false);
  });

  it('rejects secret credentials rather than treating them as publishable auth configuration',()=>{
    const result=assessPublishReadiness({...base,appConfig:{auth:{...auth,publishableKey:'sb_secret_forbidden'}}});
    expect(result.ready).toBe(false);
  });

  it('blocks duplicate normalized page routes',()=>{
    const result=assessPublishReadiness({...base,pages:[{path:'/'},{path:'/about'},{path:'about'}]});
    expect(result.ready).toBe(false);
    expect(result.checks.find(check=>check.id==='pages')?.ok).toBe(false);
  });
});
