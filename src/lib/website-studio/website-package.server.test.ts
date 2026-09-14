import {describe,expect,it,vi} from 'vitest';
import {buildWebsiteRuntimePackage} from './website-package.server';

describe('Website Studio form runtime packaging',()=>{
  it('rotates a public token and wires configured forms into script.js',async()=>{
    const update=vi.fn((row:Record<string,unknown>)=>({eq:vi.fn(async()=>({error:null,row}))}));
    const sb:any={
      from:(table:string)=>{
        if(table==='website_studio_assets')return {select:()=>({eq:async()=>({data:[],error:null})})};
        if(table==='website_studio_projects')return {update};
        throw new Error(table);
      },
      storage:{from:()=>({download:vi.fn()})},
    };
    const result=await buildWebsiteRuntimePackage(sb,{
      id:'11111111-1111-4111-8111-111111111111',name:'Forms',slug:'forms',framework:'html',
      html:'<form name="contact"></form>',css:'',javascript:'',pages:[],design_tokens:{},brief:{},
      app_config:{forms:[{name:'contact'}]},
    });
    const script=result.files.find((file)=>file.file==='script.js')?.data||'';
    expect(script).toContain('website-studio-form-submit');
    expect(script).toContain('contact');
    expect(script).toContain('blackstar:form-success');
    expect(update).toHaveBeenCalledTimes(1);
    const row=update.mock.calls[0]?.[0];
    expect(row?.['form_submit_token_hash']).toMatch(/^[0-9a-f]{64}$/);
    expect(script).not.toContain(String(row?.['form_submit_token_hash']||''));
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
