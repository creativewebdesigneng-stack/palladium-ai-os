import { normalizePagePath, websitePagePathsAreUnique } from './website-pages';
export type PublishReadinessInput={
  name:string;slug:string;html:string;css:string;pages:unknown[];qualityScore:number;appConfig?:Record<string,unknown>;saved:boolean;
};
export type PublishReadiness={ready:boolean;score:number;checks:Array<{id:string;label:string;ok:boolean;detail:string}>};
export function assessPublishReadiness(input:PublishReadinessInput):PublishReadiness{
  const app=input.appConfig||{};
  const auth=(app as any).auth||{};
  const hasUnconnectedBackend=Boolean(auth.enabled);
  const pageRecords=(Array.isArray(input.pages)?input.pages:[]).filter((page):page is Record<string,unknown>=>Boolean(page&&typeof page==='object'));
  const hasHome=pageRecords.some(page=>normalizePagePath(String(page['path']||'/'))==='/');
  const uniqueRoutes=websitePagePathsAreUnique(pageRecords.map(page=>({path:String(page['path']||'/')})));
  const checks=[
    {id:'saved',label:'Project saved',ok:input.saved,detail:'Save the Website Studio project before publishing.'},
    {id:'identity',label:'Project identity',ok:Boolean(input.name.trim()&&input.slug.trim()),detail:'Add a project name and valid slug.'},
    {id:'html',label:'Renderable HTML',ok:/<html[\s>]/i.test(input.html)&&/<body[\s>]/i.test(input.html),detail:'Generate or add a complete HTML document.'},
    {id:'pages',label:'Page structure',ok:pageRecords.length>0&&hasHome&&uniqueRoutes,detail:'Define unique page routes and keep exactly one Home (/) route.'},
    {id:'quality',label:'Quality gate',ok:input.qualityScore>=70,detail:'Raise the Website Studio quality score to at least 70.'},
    {id:'backend',label:'Backend dependencies',ok:!hasUnconnectedBackend,detail:'Authentication is configured but not provisioned for generated-site execution yet. Disable auth or connect the auth runtime before publishing.'},
  ];
  const passed=checks.filter(c=>c.ok).length;
  return {ready:checks.every(c=>c.ok),score:Math.round((passed/checks.length)*100),checks};
}
