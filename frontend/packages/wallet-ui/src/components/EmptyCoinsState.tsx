import { Image, StyleSheet, View } from "react-native";
import type { ImageStyle, ViewStyle } from "react-native";
import { Text } from "@ion/ui";
import { translate } from "@ion/localization";
import { emptyCoinsImage } from "../assets/wallet-images";

interface EmptyCoinsStateProps {
  imageStyle: ImageStyle;
  stateStyle: ViewStyle;
  textColor: string;
}

export function EmptyCoinsState({ imageStyle, stateStyle, textColor }: EmptyCoinsStateProps) {
  return (
    <View style={[styles.emptyState, stateStyle]}>
      <Image source={emptyCoinsImage} style={imageStyle} />
      <Text variant="caption2" color={textColor}>{translate("walletUi:emptyCoinsMessage")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: "center", justifyContent: "center" },
});
