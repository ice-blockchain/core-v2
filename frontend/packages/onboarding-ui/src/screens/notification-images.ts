import type { ImageSourcePropType } from "react-native";

// Vite resolves static image imports to URL strings
// Use @3x variants for retina quality on web
// @ts-expect-error — Vite asset import not recognized by TS
import receivedIonUrl from "../assets/avatar-received-ion@3x.png";
// @ts-expect-error — Vite asset import not recognized by TS
import newFollowerUrl from "../assets/avatar-new-follower@3x.png";
// @ts-expect-error — Vite asset import not recognized by TS
import newMessageUrl from "../assets/avatar-new-message@3x.png";

export const avatarReceivedIon: ImageSourcePropType = { uri: receivedIonUrl as string };
export const avatarNewFollower: ImageSourcePropType = { uri: newFollowerUrl as string };
export const avatarNewMessage: ImageSourcePropType = { uri: newMessageUrl as string };
