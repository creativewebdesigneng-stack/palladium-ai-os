import { generateBuilderSourceManifest } from "@/lib/builder/builder-source.server";
import type { Provider } from "@/lib/runtime/model-gateway.server";

export function gameFoundryEngineGuidance(targetEngine:string) {
  const guidance:Record<string,string>={
    unity:"Generate a bounded Unity starter using C# scripts and text project/config files only. Do not emit binary scenes, prefabs, packages, Library output or credentials.",
    unreal:"Generate a bounded Unreal Engine starter using C++ source, headers, Build.cs/Target.cs and text config only. Do not claim Blueprint assets, .uasset files or compiled binaries exist.",
    godot:"Generate a bounded Godot starter using GDScript, .tscn/.tres text resources and project.godot where useful.",
    web:"Generate a bounded playable web-game starter using browser-native JavaScript, HTML and CSS with no vendored dependencies. Always include index.html. Avoid module imports, remote scripts, remote stylesheets, network APIs and external assets so Blackstar can run the generated game inside a network-blocked sandboxed preview.",
    blender:"Generate a bounded Blender-oriented starter using Python automation/scripts and text configuration only. Do not claim a .blend binary was created.",
    generic:"Generate a portable game prototype source starter using text source/config files only.",
  };
  return guidance[targetEngine] ?? guidance["generic"]!;
}

export async function compileGameFoundrySourceManifest(args:{
  name:string;
  prompt:string;
  targetEngine:string;
  projectType:string;
  qualityProfile:string;
  designSpec:unknown;
  contentManifest?:unknown;
  contentGenerated?:boolean;
  provider:Provider;
  model:string;
}) {
  return generateBuilderSourceManifest({
    title:args.name,
    prompt:[
      args.prompt,
      `Target engine: ${args.targetEngine}`,
      `Project type: ${args.projectType}`,
      `Quality profile: ${args.qualityProfile}`,
      gameFoundryEngineGuidance(args.targetEngine),
      "This is a Blackstar Game Foundry project. Keep generated code bounded, game-oriented, and compatible with the approved design. Linked 3D assets are managed separately; reference import locations/placeholders rather than inventing binary asset files.",
      args.contentGenerated ? `Compiled gameplay/world content:\n${JSON.stringify(args.contentManifest)}` : "No compiled gameplay/world content manifest is available yet; do not invent one as already approved.",
    ].join("\n\n"),
    plan:args.designSpec,
    provider:args.provider,
    model:args.model,
  });
}
