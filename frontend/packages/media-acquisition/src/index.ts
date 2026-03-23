// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaPickerOptions {
  /** Allow selecting multiple items */
  allowsMultiple?: boolean;
  /** Accepted media types */
  mediaTypes?: ("images" | "videos" | "all")[];
  /** Max duration in seconds for video (native only) */
  videoMaxDuration?: number;
}

export interface CapturedMedia {
  /** Local URI to the captured/picked asset */
  uri: string;
  /** MIME type, e.g. "image/jpeg" */
  mimeType?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Image/video width in px */
  width?: number;
  /** Image/video height in px */
  height?: number;
  /** Duration in ms (videos only) */
  duration?: number;
}

export interface MediaMetadata {
  /** Original filename */
  filename?: string;
  /** Date taken / created */
  creationDate?: Date;
  /** GPS coordinates if available */
  location?: { latitude: number; longitude: number };
  /** Orientation in degrees */
  orientation?: 0 | 90 | 180 | 270;
}

// ---------------------------------------------------------------------------
// Stubs — replace with platform implementations
// ---------------------------------------------------------------------------

/**
 * Open the system media picker and return selected assets.
 * TODO: implement using expo-image-picker on native, File input on web.
 */
export async function pickMedia(_options?: MediaPickerOptions): Promise<CapturedMedia[]> {
  throw new Error("pickMedia: not implemented");
}

/**
 * Open the camera and return the captured asset.
 * TODO: implement using expo-camera on native, MediaDevices API on web.
 */
export async function captureMedia(_options?: MediaPickerOptions): Promise<CapturedMedia> {
  throw new Error("captureMedia: not implemented");
}

/**
 * Extract metadata from a local media URI.
 * TODO: implement using expo-media-library or native EXIF libraries.
 */
export async function extractMetadata(_uri: string): Promise<MediaMetadata> {
  throw new Error("extractMetadata: not implemented");
}
