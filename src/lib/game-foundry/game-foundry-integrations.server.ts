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
