import type { ImageSourcePropType } from "react-native";
import emptySearchUrl from "../assets/empty-search@3x.png";
import searchHintUrl from "../assets/search-hint@3x.png";

export const emptySearchImage: ImageSourcePropType = { uri: emptySearchUrl as unknown as string };
export const searchHintImage: ImageSourcePropType = { uri: searchHintUrl as unknown as string };
