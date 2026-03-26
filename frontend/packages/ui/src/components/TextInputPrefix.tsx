import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons/icon-types";

interface TextInputPrefixProps {
  icon: IconName;
  iconSize: number;
  iconColor: string;
  separatorStyle: ViewStyle;
}

export function TextInputPrefix({ icon, iconSize, iconColor, separatorStyle }: TextInputPrefixProps) {
  return (
    <>
      <Icon name={icon} size={iconSize} color={iconColor} />
      <View style={separatorStyle} />
    </>
  );
}
