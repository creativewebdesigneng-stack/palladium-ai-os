// Mock data for the PalladiumAI AI Tools Directory.
// Illustrative content — backend-ready for a future tools integration.

export const CATEGORIES = [
  'Writing', 'Images', 'Video', 'Audio', 'Coding', 'Research',
  'Marketing', 'Design', 'Productivity', 'Business', 'Automation', 'Data',
];

export const PRICING_TYPES = ['Free', 'Paid', 'Freemium', 'Open Source', 'Enterprise'];

const G = {
  violet: 'from-violet-500 to-indigo-500', sky: 'from-cyan-500 to-sky-500', amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-500', fuchsia: 'from-fuchsia-500 to-pink-500', blue: 'from-blue-500 to-indigo-500',
  rose: 'from-rose-500 to-pink-500', slate: 'from-slate-500 to-zinc-500', orange: 'from-orange-500 to-red-500',
};

export const TOOLS = [
  { id:'t1', name:'WriteFlow', category:'Writing', desc:'Draft, edit and polish long-form content with style-matched AI suggestions.', pricing:'Freemium', rating:4.6, website:'writeflow.ai', grad:G.violet, capabilities:['Long-form','Tone match','Grammar'] },
  { id:'t2', name:'QuillAssist', category:'Writing', desc:'AI writing copilot for emails, blogs and docs inside your editor.', pricing:'Free', rating:4.3, website:'quillassist.io', grad:G.sky, capabilities:['Email','Blogs','Inline'] },
  { id:'t3', name:'PixelForge', category:'Images', desc:'Generate and edit images with fine-grained control over style and composition.', pricing:'Paid', rating:4.8, website:'pixelforge.ai', grad:G.fuchsia, capabilities:['Generation','Inpainting','Upscale'] },
  { id:'t4', name:'BrushAI', category:'Images', desc:'Open-source image generation toolkit with LoRA training support.', pricing:'Open Source', rating:4.4, website:'github.com/brushai', grad:G.emerald, capabilities:['Open weights','LoRA','CLI'] },
  { id:'t5', name:'CineGen', category:'Video', desc:'Text-to-video with scene controls, voiceover and motion presets.', pricing:'Paid', rating:4.7, website:'cinegen.ai', grad:G.orange, capabilities:['Text-to-video','Voiceover','Motion'] },
  { id:'t6', name:'ClipStitch', category:'Video', desc:'Auto-edit raw footage into short-form clips with AI captions.', pricing:'Freemium', rating:4.2, website:'clipstitch.io', grad:G.amber, capabilities:['Auto-edit','Captions','Short-form'] },
  { id:'t7', name:'Vocalis', category:'Audio', desc:'Realistic text-to-speech and voice cloning for narration and dubbing.', pricing:'Paid', rating:4.6, website:'vocalis.ai', grad:G.blue, capabilities:['TTS','Cloning','Dubbing'] },
  { id:'t8', name:'EchoType', category:'Audio', desc:'Transcribe meetings and lectures with speaker detection and search.', pricing:'Freemium', rating:4.5, website:'echotype.io', grad:G.slate, capabilities:['Transcription','Speakers','Search'] },
  { id:'t9', name:'Codemind', category:'Coding', desc:'AI pair programmer with repo context, tests and PR review.', pricing:'Freemium', rating:4.7, website:'codemind.ai', grad:G.violet, capabilities:['Pair coding','Tests','PR review'] },
  { id:'t10', name:'DevForge', category:'Coding', desc:'Self-hostable coding agent with secure sandbox execution.', pricing:'Open Source', rating:4.3, website:'github.com/devforge', grad:G.emerald, capabilities:['Self-host','Sandbox','Agents'] },
  { id:'t11', name:'PaperScout', category:'Research', desc:'Search and summarise academic papers with cited answers.', pricing:'Freemium', rating:4.6, website:'paperscout.io', grad:G.sky, capabilities:['Search','Summarise','Citations'] },
  { id:'t12', name:'InsightLab', category:'Research', desc:'Build literature reviews with AI-assisted extraction and synthesis.', pricing:'Enterprise', rating:4.5, website:'insightlab.ai', grad:G.blue, capabilities:['Lit review','Extraction','Synthesis'] },
  { id:'t13', name:'MarketPilot', category:'Marketing', desc:'Plan campaigns, generate copy and schedule across channels.', pricing:'Paid', rating:4.4, website:'marketpilot.ai', grad:G.fuchsia, capabilities:['Campaigns','Copy','Scheduling'] },
  { id:'t14', name:'AdGenius', category:'Marketing', desc:'Generate and A/B test ad creatives with performance prediction.', pricing:'Freemium', rating:4.2, website:'adgenius.io', grad:G.rose, capabilities:['Ad creative','A/B','Prediction'] },
  { id:'t15', name:'DesignKit', category:'Design', desc:'AI design assistant for layouts, palettes and brand systems.', pricing:'Freemium', rating:4.5, website:'designkit.ai', grad:G.violet, capabilities:['Layouts','Palettes','Brand'] },
  { id:'t16', name:'WireGen', category:'Design', desc:'Turn text briefs into wireframes and component specs.', pricing:'Paid', rating:4.3, website:'wiregen.io', grad:G.slate, capabilities:['Wireframes','Specs','Briefs'] },
  { id:'t17', name:'FocusMate', category:'Productivity', desc:'AI scheduling and task prioritisation across your calendar.', pricing:'Free', rating:4.4, website:'focusmate.io', grad:G.emerald, capabilities:['Scheduling','Priority','Calendar'] },
  { id:'t18', name:'BriefBox', category:'Productivity', desc:'Summarise docs and meetings into actionable briefs automatically.', pricing:'Freemium', rating:4.3, website:'briefbox.ai', grad:G.amber, capabilities:['Summarise','Briefs','Meetings'] },
  { id:'t19', name:'DealDesk', category:'Business', desc:'AI sales assistant for lead research, outreach and forecasting.', pricing:'Paid', rating:4.6, website:'dealdesk.ai', grad:G.orange, capabilities:['Leads','Outreach','Forecasting'] },
  { id:'t20', name:'OpsLens', category:'Business', desc:'Operational analytics with anomaly detection and recommendations.', pricing:'Enterprise', rating:4.5, website:'opslens.ai', grad:G.blue, capabilities:['Analytics','Anomalies','Recommendations'] },
  { id:'t21', name:'FlowBuilder', category:'Automation', desc:'Drag-and-drop automation builder with AI step generation.', pricing:'Freemium', rating:4.4, website:'flowbuilder.io', grad:G.emerald, capabilities:['No-code','AI steps','Triggers'] },
  { id:'t22', name:'TaskWeaver', category:'Automation', desc:'Orchestrate AI agents across apps with approvals and logging.', pricing:'Enterprise', rating:4.5, website:'taskweaver.ai', grad:G.violet, capabilities:['Agents','Approvals','Logging'] },
  { id:'t23', name:'QueryMind', category:'Data', desc:'Ask questions of your warehouse in natural language with charts.', pricing:'Paid', rating:4.6, website:'querymind.ai', grad:G.sky, capabilities:['NL-to-SQL','Charts','Warehouse'] },
  { id:'t24', name:'DataScout', category:'Data', desc:'Open-source data prep and labelling pipeline for ML teams.', pricing:'Open Source', rating:4.2, website:'github.com/datascout', grad:G.slate, capabilities:['Prep','Labelling','Pipeline'] },
];