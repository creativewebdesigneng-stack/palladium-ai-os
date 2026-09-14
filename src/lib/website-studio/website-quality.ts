export type WebsiteQualityResult = {
  score:number;
  checks:Array<{id:string;label:string;ok:boolean;detail:string}>;
};

export function assessWebsiteQuality(html:string,css:string):WebsiteQualityResult {
  const source=String(html||'');
  const styles=String(css||'');
  const checks=[
    {id:'title',label:'Document title',ok:/<title>[^<]{2,}<\/title>/i.test(source),detail:'Add a meaningful <title> for search and browser tabs.'},
    {id:'lang',label:'HTML language',ok:/<html[^>]+lang=["'][^"']+["']/i.test(source),detail:'Set the document language on <html>.'},
    {id:'viewport',label:'Responsive viewport',ok:/name=["']viewport["']/i.test(source),detail:'Include a mobile viewport meta tag.'},
    {id:'main',label:'Main landmark',ok:/<main[\s>]/i.test(source),detail:'Use a <main> landmark for primary content.'},
    {id:'h1',label:'Primary heading',ok:(source.match(/<h1[\s>]/gi)||[]).length===1,detail:'Use exactly one primary <h1> on the rendered page.'},
    {id:'alt',label:'Image alt text',ok:!/<img\b(?![^>]*\balt=)[^>]*>/i.test(source),detail:'Give meaningful images alt text; use alt="" for decorative images.'},
    {id:'buttons',label:'Button names',ok:!/<button\b[^>]*>\s*(?:<[^>]+>\s*)*<\/button>/i.test(source),detail:'Buttons need visible or accessible names.'},
    {id:'focus',label:'Keyboard focus styles',ok:/:focus(?:-visible)?\b/i.test(styles),detail:'Provide visible keyboard focus styling.'},
    {id:'media',label:'Responsive CSS',ok:/@media/i.test(styles),detail:'Add responsive layout rules for smaller screens.'},
    {id:'motion',label:'Reduced motion',ok:/prefers-reduced-motion/i.test(styles),detail:'Respect reduced-motion preferences for animation-heavy sites.'},
  ];
  const passed=checks.filter(x=>x.ok).length;
  return {score:Math.round((passed/checks.length)*100),checks};
}
