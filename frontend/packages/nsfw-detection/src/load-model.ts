import { Logger } from '@ion/diagnostics';
import { loadModelPlatform } from './platform/load-model';
import type { NsfwModel } from './types';

let cachedModel: NsfwModel | null = null;

export async function loadModel(): Promise<NsfwModel> {
  if (cachedModel) return cachedModel;

  const start = Date.now();
  cachedModel = await loadModelPlatform();
  Logger.info('NSFW model loaded', {
    tag: 'nsfw-detection',
    data: { loadTimeMs: Date.now() - start },
  });
  return cachedModel;
}

export function resetModelCache(): void {
  cachedModel = null;
}
