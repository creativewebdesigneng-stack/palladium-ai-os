import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGameFoundryCapabilities, submitGameFoundryAsset, getGameFoundryAssetJob } from './game-foundry-runtime.server';

const previous = {
  url: process.env['GAME_FOUNDRY_OPEN3D_URL'],
  token: process.env['GAME_FOUNDRY_OPEN3D_TOKEN'],
  fal: process.env['FAL_API_KEY'],
  custom: process.env['GAME_FOUNDRY_3D_API_URL'],
};
const meshKeys = ['MESH_WORKER_URL','MESH_WORKER_TOKEN','THREE_D_HF_ENDPOINT_URL','HF_TOKEN','HUGGINGFACE_TOKEN'] as const;
const previousMesh = Object.fromEntries(meshKeys.map((key)=>[key, process.env[key]]));
afterEach(()=>{
  vi.restoreAllMocks();
  for (const [name,key] of [['url','GAME_FOUNDRY_OPEN3D_URL'],['token','GAME_FOUNDRY_OPEN3D_TOKEN'],
    ['fal','FAL_API_KEY'],['custom','GAME_FOUNDRY_3D_API_URL']] as const) {
    const value=previous[name];
    if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
  for (const key of meshKeys) {
    const value = previousMesh[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
function enableWorker() {
  process.env['GAME_FOUNDRY_OPEN3D_URL']='https://models.example.org';
  process.env['GAME_FOUNDRY_OPEN3D_TOKEN']='test-internal-worker-token';
  delete process.env['GAME_FOUNDRY_3D_API_URL'];
}
const health=(models:string[])=>new Response(JSON.stringify({
  status:'ok',models:models.map(id=>({id,ready:true})),
}),{status:200,headers:{'content-type':'application/json'}});
const submitted=()=>new Response(JSON.stringify({id:'123e4567-e89b-12d3-a456-426614174000',status:'queued'}),
  {status:202,headers:{'content-type':'application/json'}});

describe('no-credit triple open-source Game Foundry generator lane',()=>{
  it('never silently submits to FAL when the free worker is unavailable',async()=>{
    delete process.env['GAME_FOUNDRY_OPEN3D_URL'];delete process.env['GAME_FOUNDRY_OPEN3D_TOKEN'];
    process.env['FAL_API_KEY']='billing-locked';
    const fetchMock=vi.spyOn(globalThis,'fetch');
    await expect(submitGameFoundryAsset({sourceKind:'prompt',prompt:'A car',
      outputFormat:'obj',qualityProfile:'game_ready',targetEngine:'zmodeler',
    })).rejects.toThrow(/No free 3D generation engine/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('routes free text prompts through Shap-E, not FAL',async()=>{
    enableWorker();process.env['FAL_API_KEY']='billing-locked';
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(health(['shap-e','triposr']))
      .mockResolvedValueOnce(health(['shap-e','triposr'])).mockResolvedValueOnce(submitted());
    const result=await submitGameFoundryAsset({sourceKind:'prompt',prompt:'A four wheel racing car',
      outputFormat:'obj',qualityProfile:'game_ready',targetEngine:'zmodeler',
    });
    expect(result.provider).toBe('open3d-shap-e');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const posted=fetchMock.mock.calls[2]!;
    expect(String(posted[0])).toBe('https://models.example.org/v1/assets/generate');
    expect(JSON.parse(String(posted[1]?.body)).generator).toBe('shap-e');
    expect(JSON.parse(String(posted[1]?.body)).source_kind).toBe('prompt');
  });

  it('selects TripoSR for image sources in free auto mode',async()=>{
    enableWorker();
    delete process.env['MESH_WORKER_URL'];
    delete process.env['THREE_D_HF_ENDPOINT_URL'];
    delete process.env['HF_TOKEN'];
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(health(['triposr']))
      .mockResolvedValueOnce(health(['triposr'])).mockResolvedValueOnce(submitted());
    const result=await submitGameFoundryAsset({sourceKind:'image',
      sourceUrl:'https://assets.example.org/sports-car.png',outputFormat:'glb',
      qualityProfile:'game_ready',targetEngine:'unreal',
    });
    expect(result.provider).toBe('open3d-triposr');
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)).generator).toBe('triposr');
  });

  it('can explicitly choose TRELLIS for a 16 GB GPU worker',async()=>{
    enableWorker();
    const mock=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(health(['trellis']))
      .mockResolvedValueOnce(submitted());
    const job=await submitGameFoundryAsset({sourceKind:'prompt',prompt:'Spacecraft',
      outputFormat:'obj',qualityProfile:'cinematic',targetEngine:'blender',
      generationModel:'trellis',
    });
    expect(job.provider).toBe('open3d-trellis');
    expect(JSON.parse(String(mock.mock.calls[1]?.[1]?.body)).generator).toBe('trellis');
  });

  it('rejects unsupported text-to-3D TripoSR before charging anything',async()=>{
    enableWorker();
    const fetchMock=vi.spyOn(globalThis,'fetch');
    await expect(submitGameFoundryAsset({sourceKind:'prompt',prompt:'A chair',outputFormat:'obj',
      qualityProfile:'draft',targetEngine:'generic',generationModel:'triposr'})).rejects.toThrow(/TripoSR/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('only accepts a completed 3D job if a real HTTPS output URL is returned',async()=>{
    enableWorker();
    const mock=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      id:'123e4567-e89b-12d3-a456-426614174000', status:'completed',
      output_url:'https://models.example.org/assets/123e4567-e89b-12d3-a456-426614174000/model.obj',
    }),{status:200,headers:{'content-type':'application/json'}}));
    const result=await getGameFoundryAssetJob('123e4567-e89b-12d3-a456-426614174000','open3d-shap-e','obj');
    expect(result.status).toBe('completed');
    expect(result.outputUrl).toContain('model.obj');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('routes image auto through the image-to-mesh worker when that worker is configured',async()=>{
    delete process.env['GAME_FOUNDRY_OPEN3D_URL'];
    delete process.env['GAME_FOUNDRY_OPEN3D_TOKEN'];
    delete process.env['FAL_API_KEY'];
    process.env['MESH_WORKER_URL']='https://mesh.example.org';
    process.env['MESH_WORKER_TOKEN']='mesh-token-mesh-token-mesh';
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({
      id:'mesh-job-1', status:'queued',
    }),{status:202,headers:{'content-type':'application/json'}}));
    const result=await submitGameFoundryAsset({
      sourceKind:'image', sourceUrl:'https://assets.example.org/sports-car.png',
      outputFormat:'gltf', qualityProfile:'game_ready', targetEngine:'godot', generationModel:'auto',
    });
    expect(result.provider).toBe('modly-compatible');
    expect(result.workerJobId).toBe('mesh-job-1');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://mesh.example.org/workflow-runs/from-image');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).output_format).toBe('gltf');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send a text prompt to the image-to-mesh worker',async()=>{
    process.env['MESH_WORKER_URL']='https://mesh.example.org';
    const fetchMock=vi.spyOn(globalThis,'fetch');
    await expect(submitGameFoundryAsset({
      sourceKind:'prompt', prompt:'A chair', outputFormat:'glb',
      qualityProfile:'draft', targetEngine:'generic', generationModel:'image-to-mesh',
    })).rejects.toThrow(/image/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('advertises free model gateway separately from paid FAL readiness',()=>{
    enableWorker();delete process.env['FAL_API_KEY'];
    const caps=getGameFoundryCapabilities();
    expect(caps.assetGeneration.configuredProvider).toBe('blackstar-open3d');
    expect(caps.assetGeneration.freeWorkerConfigured).toBe(true);
    expect(caps.assetGeneration.falConfigured).toBe(false);
  });
});
