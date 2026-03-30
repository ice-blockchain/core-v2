import { Image } from 'react-native';
import { loadTensorflowModel } from 'react-native-nitro-tflite';
import type { NsfwModel } from '../types';

// Metro resolves require() to a numeric asset ID at build time.
// The .tflite extension must be registered in metro.config.js assetExts.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MODEL_ASSET = require('../../assets/nsfwjs_mobilenet_v2.tflite');

function resolveModelUrl(): string {
  const asset = Image.resolveAssetSource(MODEL_ASSET);
  const uri = asset.uri;
  // Metro dev URLs contain ../../ which NSURL cannot resolve.
  // Extract origin + query and normalize the path segments.
  const match = uri.match(/^(https?:\/\/[^/]+)(\/[^?]*)?(\?.*)?$/);
  if (!match) return uri;
  const [, origin, rawPath = '/', query = ''] = match;
  const segments: string[] = [];
  for (const seg of rawPath.split('/')) {
    if (seg === '..') segments.pop();
    else if (seg !== '' && seg !== '.') segments.push(seg);
  }
  const normalized = `${origin}/${segments.join('/')}${query}`;
  console.log(`[nsfw-detection] Resolved model URL: ${normalized}`);
  return normalized;
}

export async function loadModelPlatform(): Promise<NsfwModel> {
  const url = resolveModelUrl();
  return loadTensorflowModel({ url });
}
