import { z } from "zod";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";

const sceneSchema = z.object({
  id:z.string().trim().min(1).max(80),
  name:z.string().trim().min(1).max(160),
  purpose:z.string().trim().min(1).max(600),
  objectives:z.array(z.string().trim().min(1).max(400)).max(12),
  encounters:z.array(z.string().trim().min(1).max(500)).max(16),
  environment:z.array(z.string().trim().min(1).max(500)).max(16),
});

const contentSchema = z.object({
  overview:z.string().trim().min(20).max(2500),
  scenes:z.array(sceneSchema).min(1).max(24),
  quests:z.array(z.object({
    id:z.string().trim().min(1).max(80),
    title:z.string().trim().min(1).max(160),
    objective:z.string().trim().min(1).max(700),
    prerequisites:z.array(z.string().trim().max(200)).max(8),
    rewards:z.array(z.string().trim().max(300)).max(8),
  })).max(30),
  characters:z.array(z.object({
    id:z.string().trim().min(1).max(80),
    name:z.string().trim().min(1).max(160),
    role:z.string().trim().min(1).max(500),
    behavior:z.array(z.string().trim().max(400)).max(12),
  })).max(30),
  spawnGroups:z.array(z.object({
    id:z.string().trim().min(1).max(80),
    type:z.string().trim().min(1).max(120),
    sceneId:z.string().trim().min(1).max(80),
    count:z.number().int().min(1).max(500),
  })).max(40),
  gameplayEvents:z.array(z.object({
    id:z.string().trim().min(1).max(80),
    trigger:z.string().trim().min(1).max(500),
    effect:z.string().trim().min(1).max(700),
  })).max(40),
  assetRequirements:z.array(z.object({
    id:z.string().trim().min(1).max(80),
    name:z.string().trim().min(1).max(160),
    kind:z.enum(["environment","character","prop","vehicle","weapon","vfx","ui","audio","other"]),
    description:z.string().trim().min(1).max(700),
    priority:z.enum(["low","medium","high","critical"]),
  })).max(60),
  validation:z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});

export type GameFoundryContentManifest = z.infer<typeof contentSchema> & {
  generatedBy:{provider:Provider;model:string};
};

const SYSTEM_PROMPT=[
  "You are Blackstar Game Foundry's structured gameplay/world content compiler.",
  "Turn an approved game design into a concrete but bounded content blueprint that source generation and asset generation can consume.",
  "Do not claim scenes, assets, NPCs, quests, builds or engine files already exist.",
  "Use stable short IDs and keep references internally consistent.",
  "Return strict JSON only with exactly these keys:",
  "overview, scenes, quests, characters, spawnGroups, gameplayEvents, assetRequirements, validation.",
  "scenes contain id,name,purpose,objectives,encounters,environment.",
  "quests contain id,title,objective,prerequisites,rewards.",
  "characters contain id,name,role,behavior.",
  "spawnGroups contain id,type,sceneId,count.",
  "gameplayEvents contain id,trigger,effect.",
  "assetRequirements contain id,name,kind,description,priority.",
  "Do not include markdown fences.",
].join(" ");

export function parseGameFoundryContentManifest(text:string) {
  const unfenced=text.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/i,"").trim();
  let value:unknown;
  try{value=JSON.parse(unfenced);}catch{throw new Error("The AI content compiler returned invalid JSON.");}
  const parsed=contentSchema.safeParse(value);
  if(!parsed.success) throw new Error("The AI content compiler returned an incomplete content manifest.");
  const sceneIds=new Set(parsed.data.scenes.map((scene)=>scene.id));
  if(parsed.data.spawnGroups.some((group)=>!sceneIds.has(group.sceneId))) throw new Error("The AI content compiler returned an invalid scene reference.");
  return parsed.data;
}

export async function generateGameFoundryContent(args:{
  name:string;
  prompt:string;
  targetEngine:string;
  qualityProfile:string;
  designSpec:unknown;
  provider:Provider;
  model:string;
}):Promise<GameFoundryContentManifest>{
  const messages:ChatMessage[]=[
    {role:"system",content:SYSTEM_PROMPT},
    {role:"user",content:[
      `Project: ${args.name}`,
      `Target engine: ${args.targetEngine}`,
      `Quality: ${args.qualityProfile}`,
      `Original brief:\n${args.prompt}`,
      `Approved game design:\n${JSON.stringify(args.designSpec)}`,
    ].join("\n\n")},
  ];
  const result=await runChat({provider:args.provider,model:args.model,messages,maxTokens:5000,temperature:0.2});
  if(!result.text.trim()) throw new ProviderError("The AI content compiler returned an empty response.",502,true);
  return {...parseGameFoundryContentManifest(result.text),generatedBy:{provider:result.provider,model:result.model}};
}
