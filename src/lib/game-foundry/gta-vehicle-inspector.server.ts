/**
 * Optional GTA V interchange inspector transport.
 * This is a distinct verification lane, not a native GTA V exporter.
 */
import { assessGtaVehicleInspection } from './gta-vehicle-inspection'

export function gtaVehicleInspectorConfigured() {
  return Boolean(process.env['GAME_FOUNDRY_GTA_INSPECTOR_URL']?.trim())
}

export async function requestGtaVehicleInspection(input:{
  assetId:string;
  outputUrl:string;
  category:'car'|'motorcycle'|'truck'|'prop';
}) {
  const base=process.env['GAME_FOUNDRY_GTA_INSPECTOR_URL']?.trim().replace(/\/+$/,'')
  if(!base) throw new Error('GAME_FOUNDRY_GTA_INSPECTOR_URL is not configured.')
  const url=new URL(base)
  if(url.protocol!=='https:') throw new Error('GTA inspector requires HTTPS.')
  const token=process.env['GAME_FOUNDRY_GTA_INSPECTOR_TOKEN']?.trim()
  if(!token) throw new Error('GTA inspector authentication token is not configured.')
  const response=await fetch(`${base}/v1/gta/inspect`,{
    method:'POST',
    redirect:'manual',
    signal:AbortSignal.timeout(60_000),
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({asset_id:input.assetId,output_url:input.outputUrl,category:input.category}),
  })
  if(!response.ok) throw new Error(`GTA inspector failed with HTTP ${response.status}.`)
  const report=await response.json()
  const assessment=assessGtaVehicleInspection(report,input)
  if(!assessment.verified) throw new Error(`GTA inspection failed validation: ${assessment.errors.join('; ')}`)
  return assessment
}
