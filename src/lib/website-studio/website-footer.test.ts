import {describe,expect,it} from 'vitest';
import {buildWebsiteFooter,upsertWebsiteFooter,upsertWebsiteFooterCss} from './website-footer';

describe('Website Studio footer',()=>{
  it('renders legal and social links safely',()=>{
    const html=buildWebsiteFooter({brand:'Acme',legalLinks:[{label:'Privacy',href:'/privacy'}],socialLinks:[{label:'LinkedIn',href:'https://linkedin.com'}]});
    expect(html).toContain('Acme');
    expect(html).toContain('/privacy');
    expect(html).toContain('linkedin.com');
  });
  it('upserts without duplication',()=>{
    const once=upsertWebsiteFooter('<html><body></body></html>',{brand:'A'});
    const twice=upsertWebsiteFooter(once,{brand:'B'});
    expect((twice.match(/BLACKSTAR_FOOTER_START/g)||[])).toHaveLength(1);
    expect(twice).toContain('>B<');
    expect(upsertWebsiteFooterCss('body{}')).toContain('BLACKSTAR_FOOTER_STYLES');
  });
});
