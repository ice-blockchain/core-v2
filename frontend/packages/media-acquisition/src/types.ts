export type MediaType = "images" | "videos" | "all";

export interface MediaPickerOptions {
  allowsMultiple?: boolean;
  mediaTypes?: MediaType[];
  videoMaxDuration?: number;
}

export interface CapturedMedia {
  uri: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  duration?: number;
}

export interface MediaMetadata {
  filename?: string;
  creationDate?: Date;
  location?: { latitude: number; longitude: number };
  orientation?: 0 | 90 | 180 | 270;
}
