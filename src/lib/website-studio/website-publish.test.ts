import {describe,expect,it} from 'vitest';
import {assessPublishReadiness} from './website-publish';

const base={name:'Site',slug:'site',html:'<html><body></body></html>',css:'',pages:[{path:'/'}],qualityScore:90,saved:true};

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

  it('still blocks generated-site authentication until its runtime is provisioned',()=>{
    const result=assessPublishReadiness({
      ...base,
      appConfig:{auth:{enabled:true,providers:['email']}},
    });
    expect(result.ready).toBe(false);
    expect(result.checks.find(check=>check.id==='backend')?.ok).toBe(false);
  });

  it('blocks duplicate normalized page routes',()=>{
    const result=assessPublishReadiness({...base,pages:[{path:'/'},{path:'/about'},{path:'about'}]});
    expect(result.ready).toBe(false);
    expect(result.checks.find(check=>check.id==='pages')?.ok).toBe(false);
  });
});
