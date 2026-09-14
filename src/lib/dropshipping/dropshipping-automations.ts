export type DropshippingAutomationTemplateId=
  |'product-opportunity-research'
  |'supplier-stock-cost-watch'
  |'listing-optimisation-review'
  |'order-exception-response'
  |'customer-support-triage';

type Template={
  id:DropshippingAutomationTemplateId;
  name:string;
  description:string;
  trigger_type:'manual'|'schedule';
  schedule?:string;
  objective:string;
  requiresApproval:boolean;
};

export const DROPSHIPPING_AUTOMATION_TEMPLATES:Template[]=[
  {
    id:'product-opportunity-research',
    name:'Dropshipping · Product Opportunity Research',
    description:'Scheduled AI research for rising products, demand signals, SEO/search momentum, supplier evidence, margins and policy risk. Imported as a draft and never publishes or buys anything automatically.',
    trigger_type:'schedule',
    schedule:'0 7 * * *',
    objective:'Research current product opportunities for this dropshipping operation. Use grounded evidence, distinguish observation from inference, rank opportunities by demand/search momentum/margin/supplier quality/saturation/compliance risk, and produce a concise test plan. Never invent sales or search-volume data.',
    requiresApproval:false,
  },
  {
    id:'supplier-stock-cost-watch',
    name:'Dropshipping · Supplier Stock & Cost Watch',
    description:'Monitor supplier availability, landed-cost changes, lead times and reliability signals, then surface exceptions before they cause overselling or margin erosion.',
    trigger_type:'schedule',
    schedule:'0 */6 * * *',
    objective:'Review connected supplier and Retail Operations evidence for stock, landed cost, delivery promises, lead-time changes and reliability. Flag only evidence-backed changes. Recommend inventory, pricing or pause actions, but do not write to suppliers or channels without approval.',
    requiresApproval:true,
  },
  {
    id:'listing-optimisation-review',
    name:'Dropshipping · Listing Optimisation Review',
    description:'Reviews listing quality, SEO, claims, policy risk and conversion opportunities across connected channels while keeping publication approval-gated.',
    trigger_type:'schedule',
    schedule:'0 9 * * 1,4',
    objective:'Review current dropshipping product listings and drafts for SEO, buyer intent, clarity, structured attributes, unsupported claims, delivery expectations, returns language, IP/restricted-goods risk and marketplace policy compliance. Produce proposed improvements. Do not publish changes automatically.',
    requiresApproval:true,
  },
  {
    id:'order-exception-response',
    name:'Dropshipping · Order Exception Response',
    description:'Reviews delayed, untracked, failed-fulfilment and return-risk orders and prepares the next safe operational action.',
    trigger_type:'schedule',
    schedule:'*/30 * * * *',
    objective:'Inspect the dropshipping operations control-tower context for fulfilment exceptions, tracking gaps, delayed orders, supplier failures and return risks. Prioritise customer impact, propose grounded next actions and draft communications. Any refund, supplier order, fulfilment or marketplace write requires approval.',
    requiresApproval:true,
  },
  {
    id:'customer-support-triage',
    name:'Dropshipping · Customer Support Triage',
    description:'Creates grounded support triage and response drafts using order, tracking, returns and store-policy evidence.',
    trigger_type:'schedule',
    schedule:'0 * * * *',
    objective:'Triage current dropshipping support issues using authoritative order, tracking, returns and policy context. Draft accurate replies, identify escalations and never promise refunds, delivery dates or replacements without evidence. External sends and monetary actions require approval.',
    requiresApproval:true,
  },
];

export function buildDropshippingAutomationDefinition(input:{
  templateId:DropshippingAutomationTemplateId;
  agentId:string;
  operationName?:string;
}){
  const template=DROPSHIPPING_AUTOMATION_TEMPLATES.find(row=>row.id===input.templateId);
  if(!template)throw new Error('Unknown dropshipping automation template.');
  const agentId=String(input.agentId||'').trim();
  if(!agentId)throw new Error('Choose a Blackstar agent before creating this automation.');
  const operation=String(input.operationName||'').trim().slice(0,120);
  const context=operation? ` Operation: ${operation}.`:'';
  const steps:any[]=[
    {
      kind:'agent',
      mode:'sequential',
      name:'Analyse current dropshipping evidence',
      agent_id:agentId,
      input_template:`${template.objective}${context}`,
      requires_approval:false,
      continue_on_error:false,
      max_retries:2,
      retry_delay_ms:1000,
      timeout_ms:180000,
      config:{source:'dropshipping-hub',template_id:template.id},
    },
  ];
  if(template.requiresApproval){
    steps.push({
      kind:'approval',
      mode:'sequential',
      name:'Human review before operational follow-up',
      requires_approval:true,
      continue_on_error:false,
      max_retries:1,
      retry_delay_ms:0,
      timeout_ms:300000,
      config:{source:'dropshipping-hub',scope:'recommendation-review',template_id:template.id},
    });
  }
  steps.push({
    kind:'notification',
    mode:'sequential',
    name:'Surface result in Blackstar',
    requires_approval:false,
    continue_on_error:true,
    max_retries:1,
    retry_delay_ms:0,
    timeout_ms:30000,
    config:{source:'dropshipping-hub',channel:'in_app',template_id:template.id},
  });
  return {
    name:template.name,
    description:`${template.description}${operation? ` Workspace: ${operation}.`:''}`,
    trigger_type:template.trigger_type,
    schedule:template.schedule??null,
    steps,
  };
}
