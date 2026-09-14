import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {
  githubFormTokenTarget,
  hasStagedWebsiteStudioFormDeploymentToken,
  promoteWebsiteStudioFormDeploymentToken,
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

  it('recognizes only matching staged deployment hashes',()=>{
    const hash='a'.repeat(64);
    const tokens={
      'vercel:production':{pending_hash:hash,pending_ref:'dpl_123'},
    };
    expect(hasStagedWebsiteStudioFormDeploymentToken(tokens,'vercel:production','dpl_123')).toBe(true);
    expect(hasStagedWebsiteStudioFormDeploymentToken(tokens,'vercel:production','dpl_other')).toBe(false);
    expect(hasStagedWebsiteStudioFormDeploymentToken({'vercel:production':{pending_hash:'bad',pending_ref:'dpl_123'}},'vercel:production','dpl_123')).toBe(false);
  });

  it('stages and promotes through the narrow owner-scoped RPCs',async()=>{
    const rpc=vi.fn(async()=>({error:null}));
    const sb={rpc};
    await stageWebsiteStudioFormDeploymentToken(sb,{
      projectId:'11111111-1111-4111-8111-111111111111',target:'vercel:production',tokenHash:'b'.repeat(64),deploymentRef:'dpl_123',
    });
    await promoteWebsiteStudioFormDeploymentToken(sb,{
      projectId:'11111111-1111-4111-8111-111111111111',target:'vercel:production',deploymentRef:'dpl_123',
    });
    expect(rpc.mock.calls.map((call)=>call[0])).toEqual([
      'website_studio_stage_form_deployment_token',
      'website_studio_promote_form_deployment_token',
    ]);
  });

  it('keeps prior active tokens until a matching staged deployment is promoted',()=>{
    expect(migrationSource).toContain("- 'pending_hash' - 'pending_ref' - 'pending_at'");
    expect(migrationSource).toContain("'active_hash', v_pending_hash");
    expect(migrationSource).toContain("coalesce(v_slot ->> 'pending_ref', '') <> v_ref");
    expect(migrationSource).toContain('and p.user_id = v_user_id');
    expect(migrationSource).toContain("'^(vercel:(preview|production)|github:[0-9a-f]{64})$'");
  });

  it('activates Vercel and GitHub generated tokens only after their external side effect succeeds',()=>{
    const vercelCreated=publisherSource.indexOf('const created=await createVercelDeployment');
    const vercelStage=publisherSource.indexOf('await stageWebsiteStudioFormDeploymentToken');
    const vercelPromote=publisherSource.indexOf('await promoteWebsiteStudioFormDeploymentToken');
    expect(vercelCreated).toBeGreaterThan(-1);
    expect(vercelStage).toBeGreaterThan(vercelCreated);
    expect(vercelPromote).toBeGreaterThan(vercelStage);

    const githubRefUpdate=githubSource.indexOf("method:'PATCH'");
    const githubStage=githubSource.indexOf('await stageWebsiteStudioFormDeploymentToken');
    const githubPromote=githubSource.indexOf('await promoteWebsiteStudioFormDeploymentToken');
    expect(githubRefUpdate).toBeGreaterThan(-1);
    expect(githubStage).toBeGreaterThan(githubRefUpdate);
    expect(githubPromote).toBeGreaterThan(githubStage);
  });

  it('lets the Edge boundary accept legacy owner tokens or active deployment tokens, never pending tokens',()=>{
    expect(edgeSource).toContain('form_deployment_tokens');
    expect(edgeSource).toContain('deploymentTokenMatches');
    expect(edgeSource).toContain('slot["active_hash"]');
    expect(edgeSource).not.toContain('slot["pending_hash"]');
    expect(edgeSource).toContain('legacyTokenMatches');
  });
});
