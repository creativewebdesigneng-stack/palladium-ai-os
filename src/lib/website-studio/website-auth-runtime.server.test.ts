import {describe,expect,it} from 'vitest';
import {buildWebsiteAuthRuntime} from './website-auth-runtime.server';
import {isWebsiteAuthProvisioned,isWebsiteStudioPublicSupabaseKey,normalizeWebsiteAuthConfig,websiteAuthConfigurationIssues} from './website-auth';

const publishableKey='sb_publishable_123456789012345678901234567890';
const configured={
  auth:{
    enabled:true,
    providers:['email','magic-link','google','github'],
    supabaseUrl:'https://site-project.supabase.co',
    publishableKey,
    allowSignUp:true,
    redirectPath:'/account',
  },
};

describe('Website Studio auth configuration',()=>{
  it('requires a site-scoped publishable key and valid URL when auth is enabled',()=>{
    expect(isWebsiteAuthProvisioned(configured.auth)).toBe(true);
    expect(isWebsiteStudioPublicSupabaseKey(publishableKey)).toBe(true);
    expect(isWebsiteStudioPublicSupabaseKey('sb_secret_do-not-embed')).toBe(false);
    expect(websiteAuthConfigurationIssues({enabled:true,providers:['email'],supabaseUrl:'https://site.supabase.co',publishableKey:'sb_secret_nope'})).toContain('Use a site-scoped sb_publishable_ key; secret and service-role keys are never accepted.');
  });

  it('normalizes providers and redirect paths',()=>{
    expect(normalizeWebsiteAuthConfig({enabled:true,providers:['EMAIL','google','google','unknown'],redirectPath:'//evil.example'})).toMatchObject({providers:['email','google'],redirectPath:'/'});
  });
});

describe('Website Studio generated-site auth runtime',()=>{
  it('ships password, signup, magic-link, OAuth, session and sign-out capabilities',()=>{
    const runtime=buildWebsiteAuthRuntime(configured,'11111111-1111-4111-8111-111111111111');
    expect(runtime.enabled).toBe(true);
    expect(runtime.providers).toEqual(['email','magic-link','google','github']);
    expect(runtime.javascript).toContain('@supabase/supabase-js@2.112.2/+esm');
    expect(runtime.javascript).toContain('signInWithPassword');
    expect(runtime.javascript).toContain('signUp');
    expect(runtime.javascript).toContain('signInWithOtp');
    expect(runtime.javascript).toContain('signInWithOAuth');
    expect(runtime.javascript).toContain('getSession');
    expect(runtime.javascript).toContain('getUser');
    expect(runtime.javascript).toContain('signOut');
    expect(runtime.javascript).toContain('BlackstarAuth');
    expect(runtime.javascript).toContain('data-blackstar-auth-provider');
    expect(runtime.javascript).toContain('blackstar:auth-ready');
    expect(runtime.javascript).toContain(publishableKey);
    expect(runtime.javascript).not.toContain('service_role');
    expect(runtime.javascript).not.toContain('sb_secret_');
  });

  it('does not add a runtime when auth is disabled',()=>{
    expect(buildWebsiteAuthRuntime({auth:{enabled:false}},'p')).toEqual({javascript:'',enabled:false,providers:[]});
  });

  it('fails closed rather than packaging unprovisioned auth',()=>{
    expect(()=>buildWebsiteAuthRuntime({auth:{enabled:true,providers:['email']}},'p')).toThrow(/authentication is not provisioned/i);
    expect(()=>buildWebsiteAuthRuntime({auth:{enabled:true,providers:['email'],supabaseUrl:'https:\/\/site.supabase.co',publishableKey:'sb_secret_forbidden'}},'p')).toThrow(/sb_publishable_/i);
  });
});
