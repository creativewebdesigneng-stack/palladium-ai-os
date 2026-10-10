/**
 * GTA V vehicle preparation instructions for existing Game Foundry workers.
 * This is a bounded build specification, not evidence of native GTA V export.
 */
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string().trim().min(10).max(4000),
  sourceKind: z.enum(['prompt', 'image']),
  sourceUrl: z.string().url().optional(),
  vehicleType: z.enum(['car', 'motorcycle', 'truck', 'prop']).default('car'),
  modelName: z.string().regex(/^[a-z][a-z0-9_]{2,39}$/),
})

export function prepareGtaVehicleGeneration(input: unknown) {
  const data = requestSchema.parse(input)
  if (data.sourceKind === 'image' && !data.sourceUrl) throw new Error('Image generation requires a reference image URL.')
  const isDriveable = data.vehicleType !== 'prop'
  const instructions = [
    data.prompt,
    'Generate an original, editable GTA V-style asset as FBX/OBJ interchange geometry.',
    'Keep distinct named mesh objects, consistent metres scale, clean normals and UVs.',
    'Create separate low-poly collision proxy and at least two distance LOD meshes.',
    'Provide PBR texture maps and explicit material slots; do not assert GTA shader compatibility without conversion.',
    ...(isDriveable ? [
      'Separate chassis, wheels, glass, lights and doors into named parts.',
      'Prepare wheel pivot locations and rigging metadata; mark missing skeleton/bones for manual or licensed-worker validation.',
    ] : []),
    'Do not claim .yft, .ytd, .z3d or in-game compatibility until a licensed export worker and GTA V validation have completed.',
  ]
  return {
    targetEngine: 'zmodeler' as const,
    sourceKind: data.sourceKind,
    sourceUrl: data.sourceUrl ?? null,
    outputFormat: 'obj' as const,
    qualityProfile: 'game_ready' as const,
    modelName: data.modelName,
    vehicleType: data.vehicleType,
    generationPrompt: instructions.join('\n'),
    nativeGtaExport: false as const,
    requiresLicensedConversion: true as const,
  }
}
