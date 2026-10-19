import { describe, expect, it } from 'vitest';
import { normalizeWorkerGpuReport, workerGpuPreflightState } from '../gpu-worker-report';

describe('existing worker GPU health inventory', () => {
  it('normalises explicit ready NVIDIA health without claiming an attested GPU or completed render', () => {
    const report = normalizeWorkerGpuReport({
      ready: true, gpu: { vendor: 'NVIDIA', model: 'GeForce GTX 1080 Ti',
        vram_mib: 11264, cuda_available: true, token: 'DO_NOT_ECHO' },
    });
    expect(report).toEqual({
      source: 'worker_self_report', vendor: 'nvidia',
      model: 'GeForce GTX 1080 Ti', vramMiB: 11264, cudaAvailable: true,
      hardwareVerified: false, renderingCertified: false,
    });
    expect(JSON.stringify(report)).not.toContain('DO_NOT_ECHO');
    expect(workerGpuPreflightState({ healthy: true, reachable: true, gpuReport: report })).toBe('self_reported');
  });

  it.each([
    null, {}, { ready: false, gpu: { vendor: 'nvidia' } },
    { ready: 'true', gpu: { vendor: 'nvidia' } },
    { ready: true, gpu: { vendor: 'nvidia', model: 'https://private-host/access-token' } },
  ])('never infers hardware or a model from unsafe/missing health input %j', payload => {
    const report = normalizeWorkerGpuReport(payload);
    if (report) expect(report.model).toBeNull();
    else expect(report).toBeNull();
  });

  it('rejects invented vendor names, leaking model strings and invalid VRAM values', () => {
    expect(normalizeWorkerGpuReport({
      ready: true, gpu: { vendor: 'dell-poweredge-secret' },
    })).toBeNull();
    const result = normalizeWorkerGpuReport({
      ready: true, gpu: { vendor: 'nvidia',
        model: 'RTX 4090; bearer-secret /srv/worker/.env',
        vram_mib: 1_000_000_000, cuda_available: 'true' },
    });
    expect(result).toMatchObject({
      model: null, vramMiB: null, cudaAvailable: null,
      hardwareVerified: false,
    });
  });

  it('does not equate worker reachability or configuration with reported GPU availability', () => {
    const gpuReport = normalizeWorkerGpuReport({ ready: true, gpu: { vendor: 'nvidia' } });
    expect(workerGpuPreflightState({ healthy: false, reachable: true, gpuReport })).toBe('worker_unavailable');
    expect(workerGpuPreflightState({ healthy: true, reachable: false, gpuReport })).toBe('worker_unavailable');
    expect(workerGpuPreflightState({ healthy: true, reachable: true, gpuReport: null })).toBe('not_reported');
  });
});
