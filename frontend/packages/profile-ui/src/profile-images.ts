import type { ImageSourcePropType } from "react-native";

import postsUrl from "./assets/profile-empty-posts@3x.png";
import repliesUrl from "./assets/profile-empty-replies@3x.png";
import videoUrl from "./assets/profile-empty-video@3x.png";
import articlesUrl from "./assets/profile-empty-articles@3x.png";

export const profileEmptyPostsImage: ImageSourcePropType = { uri: postsUrl as string };
export const profileEmptyRepliesImage: ImageSourcePropType = { uri: repliesUrl as string };
export const profileEmptyVideoImage: ImageSourcePropType = { uri: videoUrl as string };
export const profileEmptyArticlesImage: ImageSourcePropType = { uri: articlesUrl as string };
