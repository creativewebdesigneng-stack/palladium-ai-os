import { createWebsiteSeed, type WebsiteSeed } from './website-seed';

export type WebsiteTemplate={
  id:string;
  name:string;
  category:string;
  description:string;
  prompt:string;
  pages:Array<{name:string;path:string;sections:string[]}>;
  designTokens:Record<string,unknown>;
  appConfig:Record<string,unknown>;
};

export const WEBSITE_TEMPLATES:WebsiteTemplate[]=[
  {id:'saas',name:'SaaS Launch',category:'Software',description:'Product-led SaaS marketing site with pricing, proof and conversion pages.',prompt:'Create a polished SaaS product website focused on product value, customer proof, pricing clarity and conversion.',pages:[{name:'Home',path:'/',sections:['Hero','Features','Proof','Pricing','CTA']},{name:'Product',path:'/product',sections:['Overview','Capabilities','Integrations','CTA']},{name:'Pricing',path:'/pricing',sections:['Pricing','FAQ','CTA']},{name:'Contact',path:'/contact',sections:['Contact','Details']}],designTokens:{theme:'dark',radius:'18px',spacing:'comfortable',typography:'modern sans'},appConfig:{forms:[{name:'Demo request',fields:[{name:'name',type:'text',required:true},{name:'email',type:'text',required:true}],submitAction:'not-connected'}],collections:[],auth:{enabled:false,providers:[]}}},
  {id:'agency',name:'Creative Agency',category:'Services',description:'High-impact agency site with services, work, proof and lead capture.',prompt:'Create a premium creative agency website with strong typography, selected work, services, proof and a lead-generation contact flow.',pages:[{name:'Home',path:'/',sections:['Hero','Work','Services','Proof','CTA']},{name:'Work',path:'/work',sections:['Projects','Case studies']},{name:'About',path:'/about',sections:['Story','Team','Values']},{name:'Contact',path:'/contact',sections:['Contact','Details']}],designTokens:{theme:'dark',radius:'10px',spacing:'spacious',typography:'editorial serif'},appConfig:{forms:[{name:'Project enquiry',fields:[{name:'name',type:'text',required:true},{name:'email',type:'text',required:true}],submitAction:'not-connected'}],collections:[],auth:{enabled:false,providers:[]}}},
  {id:'portfolio',name:'Portfolio',category:'Personal',description:'Minimal portfolio with projects, profile and contact.',prompt:'Create an elegant personal portfolio that prioritises selected work, biography and a simple contact path.',pages:[{name:'Home',path:'/',sections:['Hero','Selected work','About','CTA']},{name:'Projects',path:'/projects',sections:['Gallery','Projects']},{name:'About',path:'/about',sections:['Story','Experience']},{name:'Contact',path:'/contact',sections:['Contact']}],designTokens:{theme:'light',radius:'10px',spacing:'spacious',typography:'editorial serif'},appConfig:{forms:[],collections:[],auth:{enabled:false,providers:[]}}},
  {id:'local-business',name:'Local Business',category:'Business',description:'Trust-focused local business site with services, location and enquiries.',prompt:'Create a trustworthy local business website with services, clear contact details, location information and enquiry conversion.',pages:[{name:'Home',path:'/',sections:['Hero','Services','Proof','Location','CTA']},{name:'Services',path:'/services',sections:['Services','FAQ']},{name:'About',path:'/about',sections:['Story','Values']},{name:'Contact',path:'/contact',sections:['Contact','Location']}],designTokens:{theme:'light',radius:'18px',spacing:'comfortable',typography:'humanist sans'},appConfig:{forms:[{name:'Enquiry',fields:[{name:'name',type:'text',required:true},{name:'email',type:'text',required:true},{name:'message',type:'text',required:true}],submitAction:'not-connected'}],collections:[],auth:{enabled:false,providers:[]}}},
  {id:'product-launch',name:'Product Launch',category:'Commerce',description:'Focused launch page system for a new product or campaign.',prompt:'Create a product-launch website with a bold hero, benefits, product details, social proof placeholders, FAQs and conversion CTAs.',pages:[{name:'Home',path:'/',sections:['Hero','Benefits','Gallery','Proof','FAQ','CTA']},{name:'Details',path:'/details',sections:['Features','Specifications','FAQ']},{name:'Contact',path:'/contact',sections:['Contact']}],designTokens:{theme:'dark',radius:'28px',spacing:'comfortable',typography:'modern sans'},appConfig:{forms:[],collections:[],auth:{enabled:false,providers:[]}}},
  {id:'docs',name:'Documentation',category:'Knowledge',description:'Documentation shell with guides, reference and navigation structure.',prompt:'Create a clean technical documentation website with clear information hierarchy, guides, reference pages and accessible navigation.',pages:[{name:'Home',path:'/',sections:['Hero','Quick start','Guides']},{name:'Getting Started',path:'/getting-started',sections:['Overview','Installation','First steps']},{name:'Guides',path:'/guides',sections:['Guide index']},{name:'Reference',path:'/reference',sections:['Reference index']}],designTokens:{theme:'dark',radius:'10px',spacing:'compact',typography:'technical mono'},appConfig:{forms:[],collections:[],auth:{enabled:false,providers:[]}}},
];

export function createWebsiteFromTemplate(templateId:string,name:string):WebsiteSeed&{appConfig:Record<string,unknown>}{
  const template=WEBSITE_TEMPLATES.find(item=>item.id===templateId);
  if(!template)throw new Error('Website Studio template not found.');
  const seed=createWebsiteSeed(name,template.prompt);
  return {
    ...seed,
    pages:template.pages.map(page=>({...page})),
    designTokens:{...seed.designTokens,...template.designTokens},
    brief:{...seed.brief,templateId:template.id,templateName:template.name},
    appConfig:template.appConfig,
  };
}
