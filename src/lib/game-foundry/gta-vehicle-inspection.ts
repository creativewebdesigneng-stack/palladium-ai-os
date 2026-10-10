/**
 * Independent GTA V interchange inspection evidence.
 * This contract does not produce or certify native .yft/.ytd files.
 */
import { z } from 'zod'

export const gtaVehicleInspectionSchema = z.object({
  assetId: z.string().uuid(),
  inspectedOutputUrl: z.string().url().refine((value)=>new URL(value).protocol==='https:','HTTPS required'),
  inspector: z.object({
    provider: z.string().min(1).max(120),
    jobId: z.string().min(1).max(200),
    completedAt: z.string().datetime(),
  }),
  observed: z.object({
    meshNames: z.array(z.string().min(1).max(100)).min(1).max(300),
    materialCount: z.number().int().min(0).max(200),
    textureCount: z.number().int().min(0).max(200),
    lodCount: z.number().int().min(0).max(8),
    collisionMeshDetected: z.boolean(),
    wheelRigDetected: z.boolean(),
  }),
  nativeFilesGenerated: z.literal(false),
})

export function assessGtaVehicleInspection(input: unknown, expected: {assetId:string;outputUrl:string;category:'car'|'motorcycle'|'truck'|'prop'}) {
  const parsed=gtaVehicleInspectionSchema.safeParse(input)
  if(!parsed.success) return {verified:false,errors:parsed.error.issues.map(issue=>issue.message)}
  const report=parsed.data
  const errors:string[]=[]
  if(report.assetId!==expected.assetId||report.inspectedOutputUrl!==expected.outputUrl) errors.push('Inspection evidence does not match the completed asset.')
  if(!report.observed.collisionMeshDetected) errors.push('Inspector did not detect a collision mesh.')
  if(expected.category!=='prop'&&!report.observed.wheelRigDetected) errors.push('Inspector did not detect a vehicle wheel rig.')
  if(report.observed.meshNames.length<2) errors.push('Inspector reported insufficient mesh parts.')
  return {verified:errors.length===0,errors,report,nativeGtaFilesGenerated:false as const}
}
