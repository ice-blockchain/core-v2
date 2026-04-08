import type { ImageSourcePropType } from "react-native";
import emptySearchUrl from "../assets/empty-search@3x.png";
import searchHintUrl from "../assets/search-hint@3x.png";
import emptySearchDarkUrl from "../assets/empty-search-dark@3x.png";
import searchHintDarkUrl from "../assets/search-hint-dark@3x.png";

function buildImageSource(url: number | string): ImageSourcePropType {
  return { uri: url as string };
}

export const emptySearchImage: ImageSourcePropType = buildImageSource(emptySearchUrl);
export const searchHintImage: ImageSourcePropType = buildImageSource(searchHintUrl);
export const emptySearchDarkImage: ImageSourcePropType = buildImageSource(emptySearchDarkUrl);
export const searchHintDarkImage: ImageSourcePropType = buildImageSource(searchHintDarkUrl);
