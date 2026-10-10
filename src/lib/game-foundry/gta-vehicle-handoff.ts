/**
 * GTA V vehicle preparation contract. This validates an interchange handoff,
 * not a native GTA V export. A licensed conversion worker is still required.
 */
import { z } from 'zod'

export const gtaVehicleHandoffSchema = z.object({
  projectId: z.string().uuid(),
  sourceFormat: z.enum(['fbx', 'obj']),
  sourceUrl: z.string().url().refine((url) => new URL(url).protocol === 'https:', 'HTTPS source required'),
  category: z.enum(['car', 'motorcycle', 'truck', 'prop']),
  modelName: z.string().regex(/^[a-z][a-z0-9_]{2,39}$/),
  meshParts: z.array(z.string().min(1).max(100)).min(1).max(300),
  materials: z.array(z.string().min(1).max(100)).max(200),
  textureUrls: z.array(z.string().url()).max(200),
  lodCount: z.number().int().min(0).max(8),
  collisionMesh: z.boolean(),
  rigged: z.boolean(),
})

export type GtaVehicleHandoff = z.infer<typeof gtaVehicleHandoffSchema>

export function assessGtaVehicleHandoff(input: unknown) {
  const parsed = gtaVehicleHandoffSchema.safeParse(input)
  if (!parsed.success) return { ready: false as const, errors: parsed.error.issues.map((issue) => issue.message), warnings: [] as string[] }
  const item = parsed.data
  const errors: string[] = []
  const warnings: string[] = []
  if (!item.collisionMesh) errors.push('A validated collision mesh is required for a game-ready vehicle.')
  if (item.category !== 'prop' && !item.rigged) errors.push('Driveable vehicles require verified wheel, door and chassis rigging.')
  if (item.lodCount < 2) warnings.push('At least two LODs are recommended for game performance.')
  if (!item.materials.length) warnings.push('No GTA-compatible materials have been mapped.')
  if (!item.textureUrls.length) warnings.push('No textures are supplied.')
  return {
    ready: errors.length === 0,
    errors,
    warnings,
    handoff: item,
    exportStatus: 'interchange_only' as const,
    nativeGtaFilesGenerated: false as const,
  }
}
