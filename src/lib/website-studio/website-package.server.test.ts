import {describe,expect,it,vi} from 'vitest';
import {buildWebsiteRuntimePackage} from './website-package.server';

function createPackageSupabase(){
  const update=vi.fn();
  const sb:any={
    from:(table:string)=>{
      if(table==='website_studio_assets')return {select:()=>({eq:async()=>({data:[],error:null})})};
      if(table==='website_studio_projects')return {update};
      throw new Error(table);
    },
    storage:{from:()=>({download:vi.fn()})},
  };
  return {sb,update};
}

describe('Website Studio runtime packaging',()=>{
  it('creates an unactivated scoped form token and deterministic public form states',async()=>{
    const {sb,update}=createPackageSupabase();
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'11111111-1111-4111-8111-111111111111',name:'Forms',slug:'forms',framework:'html',
      html:'<form name="contact" data-blackstar-form="contact"><input name="email" required><input name="website"><button type="submit">Send</button></form>',
      css:'',javascript:'',pages:[],design_tokens:{},brief:{},
      app_config:{forms:[{name:'contact',fields:[{name:'email',required:true},{name:'message'}]}]},
    });

    const script=result.files.find(file=>file.file==='script.js')?.data||'';
    expect(script).toContain('website-studio-form-submit');
    expect(script).toContain('11111111-1111-4111-8111-111111111111');
    expect(script).toContain('contact');
    expect(script).toContain('email');
    expect(script).toContain('message');
    expect(script).toContain("'submitting'");
    expect(script).toContain("'success'");
    expect(script).toContain("'validation-error'");
    expect(script).toContain("'runtime-error'");
    expect(script).toContain('honeypot:submission.honeypot');
    expect(script).toContain('sourceUrl:location.href');
    expect(script).toContain('blackstar:form-success');
    expect(script).toContain('blackstar:form-error');
    expect(result.formRuntimeTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(script).not.toContain(String(result.formRuntimeTokenHash));
    expect(result.authRuntimeEnabled).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('uses one shared script runtime for multi-page packages',async()=>{
    const {sb}=createPackageSupabase();
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'22222222-2222-4222-8222-222222222222',name:'Multi page',slug:'multi-page',framework:'html',
      html:'<!doctype html><html><body><script src="script.js"></script></body></html>',css:'',javascript:'',
      pages:[
        {name:'Home',path:'/',html:'<!doctype html><html><body>Home<script src="script.js"></script></body></html>'},
        {name:'Contact',path:'/contact',html:'<!doctype html><html><body><form name="contact"></form><script src="/script.js"></script></body></html>'},
      ],
      design_tokens:{},brief:{},app_config:{forms:[{name:'contact',fields:['email']}]},
    });

    const script=result.files.find(file=>file.file==='script.js')?.data||'';
    const contact=result.files.find(file=>file.file==='contact/index.html')?.data||'';
    expect(script.match(/website-studio-form-submit/g)?.length).toBe(1);
    expect(contact).toContain('/script.js');
    expect(result.files.filter(file=>file.file==='script.js')).toHaveLength(1);
    expect(result.formRuntimeTokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('packages provisioned auth into the same shared script used by Vercel and GitHub',async()=>{
    const {sb}=createPackageSupabase();
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'44444444-4444-4444-8444-444444444444',name:'Members',slug:'members',framework:'html',html:'<html><body></body></html>',css:'',javascript:'',pages:[],design_tokens:{},brief:{},
      app_config:{auth:{enabled:true,providers:['email','github'],supabaseUrl:'https://site-project.supabase.co',publishableKey:'sb_publishable_123456789012345678901234567890',redirectPath:'/account'}},
    });
    const script=result.files.find(file=>file.file==='script.js')?.data||'';
    expect(result.authRuntimeEnabled).toBe(true);
    expect(result.authProviders).toEqual(['email','github']);
    expect(script).toContain('BlackstarAuth');
    expect(script).toContain('signInWithPassword');
    expect(script).toContain('signInWithOAuth');
    expect(script).toContain('site-project.supabase.co');
    expect(script).toContain('sb_publishable_');
    expect(script).not.toContain('sb_secret_');
  });

  it('fails closed for explicitly managed forms whose key is not configured',async()=>{
    const {sb}=createPackageSupabase();
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'33333333-3333-4333-8333-333333333333',name:'Forms',slug:'forms',framework:'html',html:'<form data-blackstar-form="unknown"></form>',css:'',javascript:'',pages:[],design_tokens:{},brief:{},app_config:{forms:[{name:'contact'}]},
    });
    const script=result.files.find(file=>file.file==='script.js')?.data||'';
    expect(script).toContain('This form is not configured for public submission.');
    expect(script).toContain("reason:'form_not_configured'");
  });

  it('does not provision form or auth runtime when neither is configured',async()=>{
    const update=vi.fn();
    const sb:any={from:(table:string)=>table==='website_studio_assets'?{select:()=>({eq:async()=>({data:[],error:null})})}:{update},storage:{from:()=>({download:vi.fn()})}};
    const result=await buildWebsiteRuntimePackage(sb,{id:'p',name:'Static',slug:'static',framework:'html',html:'',css:'',javascript:'console.log(1)',pages:[],design_tokens:{},brief:{},app_config:{}});
    expect(result.files.find(file=>file.file==='script.js')?.data).toBe('console.log(1)');
    expect(result.formRuntimeTokenHash).toBeNull();
    expect(result.authRuntimeEnabled).toBe(false);
    expect(result.authProviders).toEqual([]);
    expect(update).not.toHaveBeenCalled();
  });
});
