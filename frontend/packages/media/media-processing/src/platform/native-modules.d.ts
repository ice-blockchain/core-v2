declare module "expo-image-manipulator" {
  export interface Action {
    resize?: { width?: number; height?: number };
    crop?: {
      originX: number;
      originY: number;
      width: number;
      height: number;
    };
  }

  export interface ImageResult {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }

  export interface SaveOptions {
    compress?: number;
    format?: "jpeg" | "png" | "webp";
    base64?: boolean;
  }

  export function manipulateAsync(
    uri: string,
    actions: Action[],
    saveOptions?: SaveOptions,
  ): Promise<ImageResult>;
}

declare module "ffmpeg-kit-react-native" {
  export interface Session {
    getReturnCode(): Promise<ReturnCode>;
  }

  export class ReturnCode {
    static isSuccess(code: ReturnCode): boolean;
  }

  export class FFmpegKit {
    static execute(command: string): Promise<Session>;
  }

  export interface StreamInformation {
    getWidth(): number;
    getHeight(): number;
  }

  export interface MediaInformation {
    getStreams(): StreamInformation[];
  }

  export interface MediaInformationSession {
    getMediaInformation(): MediaInformation | null;
  }

  export class FFprobeKit {
    static getMediaInformation(
      path: string,
    ): Promise<MediaInformationSession>;
  }
}

declare module "expo-file-system" {
  export interface FileInfo {
    exists: boolean;
    size?: number;
    uri: string;
    isDirectory: boolean;
    modificationTime?: number;
  }

  export function getInfoAsync(
    uri: string,
    options?: { size?: boolean },
  ): Promise<FileInfo>;
}

declare module "react-native-video-compressor" {
  export interface CompressOptions {
    maxSize?: number;
    bitrate?: number;
  }

  export class Video {
    static compress(
      uri: string,
      options?: CompressOptions,
    ): Promise<string>;
  }
}
