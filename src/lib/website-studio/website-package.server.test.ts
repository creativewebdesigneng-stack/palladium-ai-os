import {describe,expect,it,vi} from 'vitest';
import {buildWebsiteRuntimePackage} from './website-package.server';

function createPackageSupabase(){
  const update=vi.fn((row:Record<string,unknown>)=>({eq:vi.fn(async()=>({error:null,row}))}));
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

describe('Website Studio form runtime packaging',()=>{
  it('provisions a scoped token and wires deterministic public form states and field allowlists',async()=>{
    const {sb,update}=createPackageSupabase();
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'11111111-1111-4111-8111-111111111111',name:'Forms',slug:'forms',framework:'html',
      html:'<form name="contact" data-blackstar-form="contact"><input name="email" required><input name="website"><button type="submit">Send</button></form>',
      css:'',javascript:'',pages:[],design_tokens:{},brief:{},
      app_config:{forms:[{name:'contact',fields:[{name:'email',required:true},{name:'message'}]}]},
    });

    const script=result.files.find((file)=>file.file==='script.js')?.data||'';
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

    expect(update).toHaveBeenCalledTimes(1);
    const row=update.mock.calls[0]?.[0];
    expect(row?.['form_submit_token_hash']).toMatch(/^[0-9a-f]{64}$/);
    expect(script).not.toContain(String(row?.['form_submit_token_hash']||''));
  });

  it('uses one shared script runtime for multi-page packages',async()=>{
    const {sb}=createPackageSupabase();
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'22222222-2222-4222-8222-222222222222',name:'Multi page',slug:'multi-page',framework:'html',
      html:'<!doctype html><html><body><script src="script.js"></script></body></html>',css:'',javascript:'',
      pages:[
        {name:'Home',path:'/',html:'<!doctype html><html><body>Home<script src="script.js"></script></body></html>'},
        {name:'Contact',path:'/contact',html:'<!doctype html><html><body><form name="contact"></form><script src="script.js"></script></body></html>'},
      ],
      design_tokens:{},brief:{},app_config:{forms:[{name:'contact',fields:['email']}]},
    });

    const script=result.files.find((file)=>file.file==='script.js')?.data||'';
    const contact=result.files.find((file)=>file.file==='contact.html')?.data||'';
    expect(script.match(/website-studio-form-submit/g)?.length).toBe(1);
    expect(contact).toContain('script.js');
    expect(result.files.filter((file)=>file.file==='script.js')).toHaveLength(1);
  });

  it('fails closed for explicitly managed forms whose key is not configured',async()=>{
    const {sb}=createPackageSupabase();
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'33333333-3333-4333-8333-333333333333',name:'Forms',slug:'forms',framework:'html',
      html:'<form data-blackstar-form="unknown"></form>',css:'',javascript:'',pages:[],design_tokens:{},brief:{},
      app_config:{forms:[{name:'contact'}]},
    });
    const script=result.files.find((file)=>file.file==='script.js')?.data||'';
    expect(script).toContain('This form is not configured for public submission.');
    expect(script).toContain("reason:'form_not_configured'");
  });

  it('does not provision a token when the project has no configured forms',async()=>{
    const update=vi.fn();
    const sb:any={
      from:(table:string)=>table==='website_studio_assets'?{select:()=>({eq:async()=>({data:[],error:null})})}:{update},
      storage:{from:()=>({download:vi.fn()})},
    };
    const result=await buildWebsiteRuntimePackage(sb,{id:'p',name:'Static',slug:'static',framework:'html',html:'',css:'',javascript:'console.log(1)',pages:[],design_tokens:{},brief:{},app_config:{}});
    expect(result.files.find((file)=>file.file==='script.js')?.data).toBe('console.log(1)');
    expect(update).not.toHaveBeenCalled();
  });
});
