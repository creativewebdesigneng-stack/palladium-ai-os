import {describe,expect,it} from 'vitest';
import {createWebsiteFromTemplate,WEBSITE_TEMPLATES} from './website-templates';

describe('Website Studio templates',()=>{
  it('ships multiple structured templates',()=>{expect(WEBSITE_TEMPLATES.length).toBeGreaterThanOrEqual(6)});
  it('creates a multi-page SaaS starter',()=>{const site=createWebsiteFromTemplate('saas','Acme Cloud');expect(site.pages.length).toBeGreaterThanOrEqual(4);expect(site.pages.some(page=>page.path==='/pricing')).toBe(true);expect(site.brief['templateId']).toBe('saas')});
});
