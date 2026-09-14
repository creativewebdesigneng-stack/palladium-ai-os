export type PublishReadinessInput={
  name:string;slug:string;html:string;css:string;pages:unknown[];qualityScore:number;appConfig?:Record<string,unknown>;saved:boolean;
};
export type PublishReadiness={ready:boolean;score:number;checks:Array<{id:string;label:string;ok:boolean;detail:string}>};
export function assessPublishReadiness(input:PublishReadinessInput):PublishReadiness{
  const app=input.appConfig||{};
  const auth=(app as any).auth||{};
  const forms=Array.isArray((app as any).forms)?(app as any).forms:[];
  const collections=Array.isArray((app as any).collections)?(app as any).collections:[];
  const hasUnconnectedBackend=forms.length>0||collections.length>0||Boolean(auth.enabled);
  const checks=[
    {id:'saved',label:'Project saved',ok:input.saved,detail:'Save the Website Studio project before publishing.'},
    {id:'identity',label:'Project identity',ok:Boolean(input.name.trim()&&input.slug.trim()),detail:'Add a project name and valid slug.'},
    {id:'html',label:'Renderable HTML',ok:/<html[\s>]/i.test(input.html)&&/<body[\s>]/i.test(input.html),detail:'Generate or add a complete HTML document.'},
    {id:'pages',label:'Page structure',ok:Array.isArray(input.pages)&&input.pages.length>0,detail:'Define at least one page route.'},
    {id:'quality',label:'Quality gate',ok:input.qualityScore>=70,detail:'Raise the Website Studio quality score to at least 70.'},
    {id:'backend',label:'Backend dependencies',ok:!hasUnconnectedBackend,detail:'Forms, data collections or auth are defined but not provisioned yet. Connect a backend adapter before claiming those features are live.'},
  ];
  const passed=checks.filter(c=>c.ok).length;
  return {ready:checks.every(c=>c.ok),score:Math.round((passed/checks.length)*100),checks};
}
