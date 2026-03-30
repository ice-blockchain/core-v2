import * as tf from '@tensorflow/tfjs';
import type { NsfwModel } from '../types';

const DEFAULT_MODEL_URL =
  '/models/nsfw-mobilenet/model.json';

export async function loadModelPlatform(): Promise<NsfwModel> {
  return tf.loadGraphModel(DEFAULT_MODEL_URL);
}
