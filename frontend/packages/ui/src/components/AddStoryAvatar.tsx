import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Avatar } from "./Avatar";
import { PlusIconButton } from "./PlusIconButton";

interface AddStoryAvatarProps {
  size?: number;
  imageUrl?: string | undefined;
  onPress: () => void;
  testID?: string;
}

const BUTTON_SIZE = 24;
const BUTTON_OVERFLOW = 11;

export function AddStoryAvatar({ size = 59, imageUrl, onPress, testID }: AddStoryAvatarProps) {
  const scale = useTheme().scale.scaleSize;

  const wrapperStyle = useMemo(
    () => ({ alignItems: "center" as const, paddingBottom: scale(BUTTON_OVERFLOW) }),
    [scale],
  );

  const plusStyle = useMemo(() => ({
    position: "absolute" as const,
    bottom: scale(-BUTTON_OVERFLOW),
    alignSelf: "center" as const,
    width: "100%" as const,
    alignItems: "center" as const,
  }), [scale]);

  return (
    <View style={wrapperStyle} testID={testID}>
      <View>
        <Avatar size={size} {...(imageUrl ? { imageUrl } : {})} />
        <View style={plusStyle}>
          <PlusIconButton size={BUTTON_SIZE} onPress={onPress} />
        </View>
      </View>
    </View>
  );
}
