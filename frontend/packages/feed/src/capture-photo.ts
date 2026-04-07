import { captureMedia } from "@ion/media-acquisition";
import type { CapturedMedia } from "./types";

export async function capturePhoto(): Promise<CapturedMedia | null> {
  try {
    return await captureMedia({ mediaTypes: ["images"] });
  } catch {
    return null;
  }
}
