import type { ReactNode } from "react";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import type { IconName } from "@ion/ui";
import { Icon, Text, useTheme } from "@ion/ui";
import { DynamicSheet } from "./DynamicSheet";
import { InformationSheetContent } from "./information-sheet-content";

interface DoubleActionSheetScreenProps {
  iconName: IconName;
  iconColor?: string;
  title: string;
  description: ReactNode;
  secondaryLabel: string;
  primaryLabel: string;
  onSecondaryPress: () => void;
  onPrimaryPress: () => void;
  isSecondaryLoading?: boolean;
  isPrimaryLoading?: boolean;
  onDismiss?: () => void;
}

function buildButtonRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    gap: scale(15),
    paddingHorizontal: scale(16),
    paddingBottom: scale(20),
    paddingTop: scale(28),
  };
}

function buildSecondaryButtonStyle(scale: (n: number) => number, borderColor: string): ViewStyle {
  return {
    flex: 1,
    height: scale(56),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor,
    alignItems: "center",
    justifyContent: "center",
  };
}

function buildPrimaryButtonStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    flex: 1,
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor,
    alignItems: "center",
    justifyContent: "center",
  };
}

function SecondaryButton({ label, onPress, isLoading }: { label: string; onPress: () => void; isLoading: boolean }) {
  const { scale, colors } = useTheme();
  const style = useMemo(
    () => buildSecondaryButtonStyle(scale.scaleSize, colors.strokeElements),
    [scale.scaleSize, colors.strokeElements],
  );

  return (
    <Pressable style={style} onPress={onPress} disabled={isLoading}>
      {isLoading
        ? <ActivityIndicator color={colors.secondaryText} size={20} />
        : <Text variant="body" color={colors.secondaryText}>{label}</Text>}
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, isLoading }: { label: string; onPress: () => void; isLoading: boolean }) {
  const { scale, colors } = useTheme();
  const style = useMemo(
    () => buildPrimaryButtonStyle(scale.scaleSize, colors.primaryAccent),
    [scale.scaleSize, colors.primaryAccent],
  );

  return (
    <Pressable style={style} onPress={onPress} disabled={isLoading}>
      {isLoading
        ? <ActivityIndicator color={colors.onPrimaryAccent} size={20} />
        : <Text variant="body" color={colors.onPrimaryAccent}>{label}</Text>}
    </Pressable>
  );
}

function buildSheetIcon(iconName: IconName, size: number, iconColor?: string) {
  return <Icon name={iconName} size={size} {...(iconColor ? { color: iconColor } : {})} />;
}

export function DoubleActionSheetScreen({
  iconName, iconColor, title, description,
  secondaryLabel, primaryLabel,
  onSecondaryPress, onPrimaryPress,
  isSecondaryLoading = false, isPrimaryLoading = false,
  onDismiss,
}: DoubleActionSheetScreenProps) {
  const { scale } = useTheme();
  const scaleSize = scale.scaleSize;
  const rowStyle = useMemo(() => buildButtonRowStyle(scaleSize), [scaleSize]);

  return (
    <DynamicSheet showClose={false} {...(onDismiss ? { onDismiss } : {})}>
      <InformationSheetContent
        icon={buildSheetIcon(iconName, scaleSize(80), iconColor)}
        title={title}
        description={description}
        topPadding={30}
      />
      <View style={rowStyle}>
        <SecondaryButton label={secondaryLabel} onPress={onSecondaryPress} isLoading={isSecondaryLoading} />
        <PrimaryButton label={primaryLabel} onPress={onPrimaryPress} isLoading={isPrimaryLoading} />
      </View>
    </DynamicSheet>
  );
}
