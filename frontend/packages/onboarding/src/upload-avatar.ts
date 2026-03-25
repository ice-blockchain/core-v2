import type { UploadAvatarInput, UploadAvatarResult } from "./types";

// TODO: Wire to @ion/media-upload + @ion/nsfw-detection when available
export async function uploadAvatar(_input: UploadAvatarInput): Promise<UploadAvatarResult> {
  throw new Error("uploadAvatar not implemented — wire to @ion/media-upload");
}
