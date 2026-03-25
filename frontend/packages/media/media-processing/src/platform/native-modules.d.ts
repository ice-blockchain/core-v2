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
