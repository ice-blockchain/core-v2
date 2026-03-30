import type { ImageSourcePropType } from "react-native";

// Vite resolves static image imports to URL strings.
// Use @3x variants for retina quality on web.
// Bundler module resolution treats these as valid imports.
import receivedIonUrl from "../assets/avatar-received-ion@3x.png";
import newFollowerUrl from "../assets/avatar-new-follower@3x.png";
import newMessageUrl from "../assets/avatar-new-message@3x.png";

export const avatarReceivedIon: ImageSourcePropType = { uri: receivedIonUrl as string };
export const avatarNewFollower: ImageSourcePropType = { uri: newFollowerUrl as string };
export const avatarNewMessage: ImageSourcePropType = { uri: newMessageUrl as string };
