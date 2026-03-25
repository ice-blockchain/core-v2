import { Pressable } from "react-native";
import type { ScaleFunctions } from "../scaling/scaling-types";
import { Icon } from "../icons/Icon";

export interface TextFieldClearButtonProps {
  onPress: () => void;
  fillColor: string;
  scale: ScaleFunctions;
}

const BUTTON_SIZE = 24;

export function TextFieldClearButton(props: TextFieldClearButtonProps) {
  const { onPress, fillColor, scale } = props;
  const size = scale.scaleSize(BUTTON_SIZE);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name="close" color={fillColor} size={size} />
    </Pressable>
  );
}
