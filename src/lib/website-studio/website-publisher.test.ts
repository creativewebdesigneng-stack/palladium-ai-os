import {describe,expect,it} from 'vitest';
import {wireFormRuntime} from './website-publisher.functions';

describe('Website Studio automatic form wiring',()=>{
  it('injects the runtime into every HTML page and leaves non-HTML files unchanged',()=>{
    const files=[
      {file:'index.html',data:'<html><body><form name="Contact"></form></body></html>',encoding:'utf-8' as const},
      {file:'about/index.html',data:'<html><body>About</body></html>',encoding:'utf-8' as const},
      {file:'styles.css',data:'body{}',encoding:'utf-8' as const},
    ];
    const wired=wireFormRuntime(files,'11111111-1111-4111-8111-111111111111','https://example.supabase.co/functions/v1/website-studio-form-submit','secret-token');
    expect(wired[0]!.data).toContain('blackstar:form-success');
    expect(wired[1]!.data).toContain('website-studio-form-submit');
    expect(wired[2]!.data).toBe('body{}');
    expect(wired[0]!.data).toContain('secret-token');
  });
});
