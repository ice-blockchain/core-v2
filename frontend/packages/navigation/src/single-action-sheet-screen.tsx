import type { ReactNode } from "react";
import { useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import type { IconName } from "@ion/ui";
import { Button, Icon, useTheme } from "@ion/ui";
import { DynamicSheet } from "./DynamicSheet";
import { InformationSheetContent } from "./information-sheet-content";

interface SingleActionSheetScreenProps {
  iconName: IconName;
  iconColor?: string;
  title: string;
  description: ReactNode;
  buttonLabel: string;
  onPress: () => void;
  isLoading?: boolean;
  isDismissable?: boolean;
  onDismiss?: () => void;
}

function buildButtonContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    paddingTop: scale(28),
  };
}

export function SingleActionSheetScreen({
  iconName,
  iconColor,
  title,
  description,
  buttonLabel,
  onPress,
  isLoading = false,
  isDismissable = true,
  onDismiss,
}: SingleActionSheetScreenProps) {
  const { scale } = useTheme();
  const scaleSize = scale.scaleSize;
  const containerStyle = useMemo(() => buildButtonContainerStyle(scaleSize), [scaleSize]);

  return (
    <DynamicSheet showClose={false} isDismissable={isDismissable} {...(onDismiss ? { onDismiss } : {})}>
      <InformationSheetContent
        icon={<Icon name={iconName} size={scaleSize(80)} {...(iconColor ? { color: iconColor } : {})} />}
        title={title}
        description={description}
        topPadding={30}
      />
      <View style={containerStyle}>
        <Button label={buttonLabel} onPress={onPress} isLoading={isLoading} />
      </View>
    </DynamicSheet>
  );
}
