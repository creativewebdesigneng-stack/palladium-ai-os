import { friendlyMessage } from '../errors';

const HIDDEN_FAILURE = 'Something went wrong. Please try again.';

export function gameFoundryAssetErrorMessage(error, stage) {
  const mapped = friendlyMessage(error);
  if (mapped !== HIDDEN_FAILURE && mapped !== 'Something went wrong on our side. Please try again.') {
    return mapped;
  }
  switch (stage) {
    case 'upload':
      return 'The image or model upload failed before a generation job was created. Check your sign-in session, file size and format, then retry.';
    case 'prepare':
      return 'Blackstar could not prepare this asset request. Check the asset name, source image URL and selected settings.';
    case 'submit':
      return 'Blackstar could not create or submit the 3D job. Refresh your session and retry. No generation job has been confirmed.';
    default:
      return 'Game Foundry could not start the request. Check your session and the selected asset source before retrying.';
  }
}

/** @param {{ inputName: string, sourceKind: string, prompt?: string | null, sourceUrl?: string | null, sourceFile?: { name: string, size: number } | null }} input */
export function validateGameFoundryAssetInput({ inputName, sourceKind, prompt = null, sourceUrl = null, sourceFile = null }) {
  const name = String(inputName ?? '').trim();
  if (!name) throw new Error('Enter a name for the 3D asset.');
  if (name.length > 240) throw new Error('3D asset names must be 240 characters or fewer.');
  if (sourceKind === 'prompt') {
    if (!String(prompt ?? '').trim()) throw new Error('Enter a description for prompt-to-3D generation.');
    if (String(prompt).length > 10000) throw new Error('The 3D description is too long. Limit it to 10,000 characters.');
    return;
  }
  if (sourceKind !== 'image' && sourceKind !== 'model') throw new Error('Select a supported 3D source type.');
  if (sourceFile) {
    if (sourceFile.size > 100 * 1024 * 1024) throw new Error('Game Foundry source files must be 100 MB or smaller.');
    const ext = String(sourceFile.name ?? '').split('.').pop()?.toLowerCase();
    const extensions = sourceKind === 'image' ? ['png', 'jpg', 'jpeg', 'webp', 'avif'] : ['glb', 'gltf', 'fbx', 'obj', 'usd', 'usdz', 'ply', 'stl', 'vox'];
    if (!extensions.includes(ext)) throw new Error('That file type is not supported for the selected 3D source.');
    return;
  }
  if (!String(sourceUrl ?? '').trim()) throw new Error('Choose a source file or provide a public source URL.');
  try {
    const url = new URL(sourceUrl);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('not HTTP');
    if (!url.hostname || url.username || url.password) throw new Error('not public');
  } catch {
    throw new Error('Enter a valid public HTTP or HTTPS source URL.');
  }
}
