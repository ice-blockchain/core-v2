import type { ImageSourcePropType } from "react-native";
import {
  profileEmptyPostsImage,
  profileEmptyRepliesImage,
  profileEmptyVideoImage,
  profileEmptyArticlesImage,
} from "./profile-images";

export interface TabPageConfig {
  key: string;
  image: ImageSourcePropType;
  ownKey: string;
  otherKey: string;
}

export const TAB_PAGE_CONFIG: readonly TabPageConfig[] = [
  { key: "posts", image: profileEmptyPostsImage, ownKey: "emptyPostsOwn", otherKey: "emptyPostsOther" },
  { key: "replies", image: profileEmptyRepliesImage, ownKey: "emptyRepliesOwn", otherKey: "emptyRepliesOther" },
  { key: "videos", image: profileEmptyVideoImage, ownKey: "emptyVideosOwn", otherKey: "emptyVideosOther" },
  { key: "articles", image: profileEmptyArticlesImage, ownKey: "emptyArticlesOwn", otherKey: "emptyArticlesOther" },
];
