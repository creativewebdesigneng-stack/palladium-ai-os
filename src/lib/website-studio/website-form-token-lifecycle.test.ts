import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {
  githubFormTokenTarget,
  hasStagedWebsiteStudioFormDeploymentToken,
  promoteWebsiteStudioFormDeploymentToken,
  stagedWebsiteStudioFormDeploymentTokenRef,
  stageWebsiteStudioFormDeploymentToken,
  vercelFormTokenTarget,
} from './website-form-deployment-tokens.server';

const migrationSource=readFileSync(new URL('../../../supabase/migrations/20260914134000_website_studio_form_deployment_tokens.sql',import.meta.url),'utf8');
const edgeSource=readFileSync(new URL('../../../supabase/functions/website-studio-form-submit/index.ts',import.meta.url),'utf8');
const publisherSource=readFileSync(new URL('./website-publisher.functions.ts',import.meta.url),'utf8');
const githubSource=readFileSync(new URL('./website-github.functions.ts',import.meta.url),'utf8');

describe('Website Studio generated form token lifecycle',()=>{
  it('uses stable target scopes without exposing repository details in the GitHub token slot',()=>{
    expect(vercelFormTokenTarget('preview')).toBe('vercel:preview');
    expect(vercelFormTokenTarget('production')).toBe('vercel:production');
    const target=githubFormTokenTarget('Owner/Repo','main','site');
    expect(target).toMatch(/^github:[0-9a-f]{64}$/);
    expect(target).toBe(githubFormTokenTarget('owner/repo','main','site'));
    expect(target).not.toContain('owner');
  });

  it('recognizes only valid staged deployment hashes and returns their staging ref',()=>{
    const hash='a'.repeat(64);
    const tokens={
      'vercel:production':{pending_hash:hash,pending_ref:'stage_123'},
    };
    expect(stagedWebsiteStudioFormDeploymentTokenRef(tokens,'vercel:production')).toBe('stage_123');
    expect(hasStagedWebsiteStudioFormDeploymentToken(tokens,'vercel:production','stage_123')).toBe(true);
    expect(hasStagedWebsiteStudioFormDeploymentToken(tokens,'vercel:production','stage_other')).toBe(false);
    expect(stagedWebsiteStudioFormDeploymentTokenRef({'vercel:production':{pending_hash:'bad',pending_ref:'stage_123'}},'vercel:production')).toBeNull();
  });

  it('stages and promotes through the narrow owner-scoped RPCs',async()=>{
    const rpc=vi.fn(async()=>({error:null}));
    const sb={rpc};
    await stageWebsiteStudioFormDeploymentToken(sb,{
      projectId:'11111111-1111-4111-8111-111111111111',target:'vercel:production',tokenHash:'b'.repeat(64),stagingRef:'stage_123',
    });
    await promoteWebsiteStudioFormDeploymentToken(sb,{
      projectId:'11111111-1111-4111-8111-111111111111',target:'vercel:production',stagingRef:'stage_123',activeRef:'dpl_123',
    });
    expect(rpc.mock.calls.map((call)=>call[0])).toEqual([
      'website_studio_stage_form_deployment_token',
      'website_studio_promote_form_deployment_token',
    ]);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({p_staging_ref:'stage_123'});
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({p_staging_ref:'stage_123',p_active_ref:'dpl_123'});
  });

  it('keeps prior active tokens until a matching staged deployment is promoted',()=>{
    expect(migrationSource).toContain("- 'pending_hash' - 'pending_ref' - 'pending_at'");
    expect(migrationSource).toContain("'active_hash', v_pending_hash");
    expect(migrationSource).toContain("coalesce(v_slot ->> 'pending_ref', '') <> v_staging_ref");
    expect(migrationSource).toContain("'active_ref', v_active_ref");
    expect(migrationSource).toContain('and p.user_id = v_user_id');
    expect(migrationSource).toContain("'^(vercel:(preview|production)|github:[0-9a-f]{64})$'");
    expect(migrationSource).toContain('to authenticated;');
    expect(migrationSource).toContain('from public, anon, service_role;');
  });

  it('revokes superseded GitHub target slots only when a replacement is promoted',()=>{
    expect(migrationSource).toContain("if v_target like 'github:%' then");
    expect(migrationSource).toContain("entry.key not like 'github:%'");
    expect(migrationSource).toContain('or entry.key = v_target');
    expect(migrationSource.indexOf("if v_target like 'github:%' then")).toBeGreaterThan(migrationSource.indexOf("v_pending_hash := v_slot ->> 'pending_hash'"));
  });

  it('stages Vercel before deployment and promotes only after verified readiness',()=>{
    const vercelStage=publisherSource.indexOf('await stageWebsiteStudioFormDeploymentToken');
    const vercelCreated=publisherSource.indexOf('const created=await createVercelDeployment');
    const vercelReady=publisherSource.indexOf('if(verified.verified)');
    const vercelPromote=publisherSource.indexOf('await promoteWebsiteStudioFormDeploymentToken');
    expect(vercelStage).toBeGreaterThan(-1);
    expect(vercelCreated).toBeGreaterThan(vercelStage);
    expect(vercelReady).toBeGreaterThan(vercelCreated);
    expect(vercelPromote).toBeGreaterThan(vercelReady);
  });

  it('stages GitHub after commit creation, switches the ref, then promotes',()=>{
    const commitSha=githubSource.indexOf("const commitSha=typeof commit['sha']==='string'");
    const githubStage=githubSource.indexOf('await stageWebsiteStudioFormDeploymentToken');
    const githubRefUpdate=githubSource.indexOf("method:'PATCH'");
    const githubPromote=githubSource.indexOf('await promoteWebsiteStudioFormDeploymentToken');
    expect(commitSha).toBeGreaterThan(-1);
    expect(githubStage).toBeGreaterThan(commitSha);
    expect(githubRefUpdate).toBeGreaterThan(githubStage);
    expect(githubPromote).toBeGreaterThan(githubRefUpdate);
  });

  it('lets the Edge boundary accept legacy owner tokens or active deployment tokens, never pending tokens',()=>{
    expect(edgeSource).toContain('form_deployment_tokens');
    expect(edgeSource).toContain('deploymentTokenMatches');
    expect(edgeSource).toContain('slot["active_hash"]');
    expect(edgeSource).not.toContain('slot["pending_hash"]');
    expect(edgeSource).toContain('legacyTokenMatches');
  });
});
