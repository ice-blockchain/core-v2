import type { MediaViewerSource } from "@ion/media-viewer";

// Vite resolves static image imports to URL strings.
// Use @3x variants for retina quality on web.
import receivedIonUrl from "../assets/avatar-received-ion@3x.png";
import newFollowerUrl from "../assets/avatar-new-follower@3x.png";
import newMessageUrl from "../assets/avatar-new-message@3x.png";

export const avatarReceivedIon: MediaViewerSource = { uri: receivedIonUrl as string, mimeType: "image/png" };
export const avatarNewFollower: MediaViewerSource = { uri: newFollowerUrl as string, mimeType: "image/png" };
export const avatarNewMessage: MediaViewerSource = { uri: newMessageUrl as string, mimeType: "image/png" };
