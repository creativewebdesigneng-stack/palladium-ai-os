export type FoundryIntegrationStatus = "configured_bridge" | "export_only";
export type FoundryIntegration = {
  id: string;
  name: string;
  category: "engine" | "dcc";
  status: FoundryIntegrationStatus;
  bridgeConfigured: boolean;
  formats: string[];
  mechanism: string;
  note: string;
};

const definitions = [
  { id:"unity", name:"Unity", category:"engine", env:"GAME_FOUNDRY_UNITY_BRIDGE_URL", formats:["fbx","glb","gltf","obj"], mechanism:"plugin-or-export" },
  { id:"unreal", name:"Unreal Engine", category:"engine", env:"GAME_FOUNDRY_UNREAL_BRIDGE_URL", formats:["fbx","glb","gltf","usd"], mechanism:"plugin-or-export" },
  { id:"godot", name:"Godot", category:"engine", env:"GAME_FOUNDRY_GODOT_BRIDGE_URL", formats:["glb","gltf","obj"], mechanism:"plugin-or-export" },
  { id:"blender", name:"Blender", category:"dcc", env:"GAME_FOUNDRY_BLENDER_BRIDGE_URL", formats:["blend","fbx","glb","gltf","obj","usd"], mechanism:"python-bridge-or-export" },
  { id:"maya", name:"Autodesk Maya", category:"dcc", env:"GAME_FOUNDRY_MAYA_BRIDGE_URL", formats:["fbx","obj","usd"], mechanism:"plugin-or-export" },
  { id:"3ds-max", name:"Autodesk 3ds Max", category:"dcc", env:"GAME_FOUNDRY_3DSMAX_BRIDGE_URL", formats:["fbx","obj","usd"], mechanism:"plugin-or-export" },
  { id:"houdini", name:"Houdini", category:"dcc", env:"GAME_FOUNDRY_HOUDINI_BRIDGE_URL", formats:["fbx","obj","usd","gltf"], mechanism:"plugin-or-export" },
  { id:"zmodeler3", name:"ZModeler3", category:"dcc", env:"GAME_FOUNDRY_ZMODELER_BRIDGE_URL", formats:["fbx","obj"], mechanism:"bridge-if-configured-or-export" },
] as const;

export function getGameFoundryIntegrations(): FoundryIntegration[] {
  return definitions.map((item) => {
    const configured = Boolean((process.env[item.env] || "").trim());
    return {
      id:item.id,
      name:item.name,
      category:item.category,
      status:configured ? "configured_bridge" : "export_only",
      bridgeConfigured:configured,
      formats:[...item.formats],
      mechanism:item.mechanism,
      note:configured
        ? "A dedicated Blackstar bridge endpoint is configured for this application."
        : "No remote bridge is configured. Blackstar can prepare compatible exports only.",
    };
  });
}


type HealthTarget = {
  id:string;
  name:string;
  env:string;
  tokenEnv?:string;
  category:"worker"|"engine"|"dcc";
};

const healthTargets:HealthTarget[] = [
  {id:"3d-worker",name:"Game Foundry 3D Worker",env:"GAME_FOUNDRY_3D_API_URL",tokenEnv:"GAME_FOUNDRY_3D_API_TOKEN",category:"worker"},
  {id:"game-worker",name:"Game Foundry Game Worker",env:"GAME_FOUNDRY_GAME_API_URL",tokenEnv:"GAME_FOUNDRY_GAME_API_TOKEN",category:"worker"},
  ...definitions.map((item)=>({id:item.id,name:item.name,env:item.env,tokenEnv:"GAME_FOUNDRY_ENGINE_BRIDGE_TOKEN",category:item.category as "engine"|"dcc"})),
];

function cleanBase(value:string|undefined){
  return (value||"").trim().replace(/\/+$/,"");
}

export async function probeGameFoundryConnections(){
  const results=[];
  for(const target of healthTargets){
    const base=cleanBase(process.env[target.env]);
    if(!base){
      results.push({id:target.id,name:target.name,category:target.category,configured:false,reachable:false,healthy:false,httpStatus:null,error:null});
      continue;
    }
    const token=target.tokenEnv?process.env[target.tokenEnv]?.trim():"";
    const started=Date.now();
    try{
      const response=await fetch(`${base}/health`,{
        method:"GET",
        headers:token?{Authorization:`Bearer ${token}`}:{},
        redirect:"manual",
        signal:AbortSignal.timeout(8000),
      });
      results.push({
        id:target.id,name:target.name,category:target.category,configured:true,reachable:true,healthy:response.ok,
        httpStatus:response.status,latencyMs:Math.max(0,Date.now()-started),error:response.ok?null:`Health endpoint returned HTTP ${response.status}.`,
      });
    }catch(error){
      results.push({
        id:target.id,name:target.name,category:target.category,configured:true,reachable:false,healthy:false,httpStatus:null,
        latencyMs:Math.max(0,Date.now()-started),
        error:error instanceof Error?error.message.slice(0,240):"Connection probe failed.",
      });
    }
  }
  return {
    checkedAt:new Date().toISOString(),
    results,
    summary:{
      configured:results.filter((item)=>item.configured).length,
      reachable:results.filter((item)=>item.reachable).length,
      healthy:results.filter((item)=>item.healthy).length,
      total:results.length,
    },
    note:"Health probes use only server-configured endpoints and credentials. A reachable endpoint with a non-2xx /health response is not marked healthy.",
  };
}
