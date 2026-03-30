// --- Public ---

export type SafetyCategoryLabel =
  | 'explicit'
  | 'suggestive'
  | 'violence'
  | 'hate';

export interface SafetyCategory {
  label: SafetyCategoryLabel;
  confidence: number;
  isAboveThreshold: boolean;
}

export interface SafetyResult {
  isSafe: boolean;
  categories: SafetyCategory[];
}

export type FrameSamplingStrategy = 'uniform' | 'random';

export interface VideoSafetyOptions {
  frameCount?: number;
  strategy?: FrameSamplingStrategy;
  earlyExit?: boolean;
  durationMs?: number;
}

export interface VideoFrameDetail {
  index: number;
  uri: string;
  scores: RawInferenceScores;
  categories: SafetyCategory[];
}

export interface VideoSafetyResult extends SafetyResult {
  framesAnalyzed: number;
  totalFramesRequested: number;
  flaggedFrameIndices: number[];
  frames: VideoFrameDetail[];
}

// --- Internal (not re-exported) ---

export interface CategoryThreshold {
  label: SafetyCategoryLabel;
  threshold: number;
}

export interface PreprocessedImage {
  data: Float32Array;
  width: number;
  height: number;
  channels: number;
}

export interface RawInferenceScores {
  explicit: number;
  suggestive: number;
  violence: number;
  hate: number;
}

export interface ExtractedFrame {
  uri: string;
  timestampMs: number;
  index: number;
}

export interface FrameInferenceResult {
  frameIndex: number;
  scores: RawInferenceScores;
  categories: SafetyCategory[];
}

export type NsfwModel = unknown;
