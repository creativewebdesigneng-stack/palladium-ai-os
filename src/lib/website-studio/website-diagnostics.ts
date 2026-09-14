export type WebsiteDiagnostic={id:string;severity:'error'|'warning'|'info';message:string;fixPrompt:string};

export function diagnoseWebsiteProject(html:string,css:string,javascript:string):WebsiteDiagnostic[]{
  const diagnostics:WebsiteDiagnostic[]=[];
  const source=String(html||'');
  const styles=String(css||'');
  const js=String(javascript||'');

  if(!/<html[\s>]/i.test(source)||!/<body[\s>]/i.test(source)){
    diagnostics.push({id:'document-shell',severity:'error',message:'The project is missing a complete HTML document shell.',fixPrompt:'Add a valid <!doctype html>, html, head and body structure while preserving the existing design.'});
  }
  if(/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/i.test(js)){
    diagnostics.push({id:'unsafe-js',severity:'error',message:'JavaScript contains an unsafe dynamic-execution pattern.',fixPrompt:'Remove eval, Function constructor and document.write usage. Replace them with explicit safe browser logic.'});
  }
  if(/fetch\s*\(|XMLHttpRequest|WebSocket\s*\(/i.test(js)){
    diagnostics.push({id:'network-js',severity:'warning',message:'JavaScript contains network access that needs integration review.',fixPrompt:'Review all network calls, keep only explicitly requested benign integrations, and make endpoints/configuration clear.'});
  }
  if(/<form\b/i.test(source)&&!/aria-label|<label\b/i.test(source)){
    diagnostics.push({id:'form-labels',severity:'warning',message:'A form may be missing accessible labels.',fixPrompt:'Add explicit accessible labels and names to all form controls without changing the intended layout.'});
  }
  if(/position\s*:\s*fixed/i.test(styles)&&!/max-width|@media/i.test(styles)){
    diagnostics.push({id:'fixed-layout',severity:'warning',message:'Fixed positioning is present without clear responsive guards.',fixPrompt:'Make fixed-position UI responsive and ensure it does not cover content on mobile screens.'});
  }
  if((source.match(/id=["'][^"']+["']/gi)||[]).length!==new Set((source.match(/id=["']([^"']+)["']/gi)||[]).map(x=>x.toLowerCase())).size){
    diagnostics.push({id:'duplicate-ids',severity:'warning',message:'The HTML may contain duplicate element IDs.',fixPrompt:'Make element IDs unique and update matching anchors or script selectors.'});
  }
  if(!/prefers-reduced-motion/i.test(styles)&&/(animation|transition)\s*:/i.test(styles)){
    diagnostics.push({id:'motion',severity:'info',message:'Animations are present without a reduced-motion override.',fixPrompt:'Add a prefers-reduced-motion fallback that disables non-essential motion.'});
  }
  return diagnostics;
}

export function buildWebsiteRepairPrompt(diagnostics:WebsiteDiagnostic[]):string{
  if(!diagnostics.length)return 'Review the website for correctness, responsiveness and accessibility. Preserve the current design unless a fix is necessary.';
  return ['Fix the following Website Studio diagnostics while preserving the current design and content structure:',...diagnostics.map((d,i)=>`${i+1}. [${d.severity}] ${d.message} Required fix: ${d.fixPrompt}`)].join('\n');
}
