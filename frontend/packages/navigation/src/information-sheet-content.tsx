import type { ReactNode } from "react";
import { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useTheme } from "@ion/ui";
import { buildInformationContentStyle, buildInformationTextGroupStyle } from "./information-sheet-styles";

const CENTER_TEXT = { textAlign: "center" } as const;

interface InformationSheetContentProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
}

export function InformationSheetContent({ icon, title, description }: InformationSheetContentProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const contentStyle = useMemo(() => buildInformationContentStyle(scale), [scale]);
  const textGroupStyle = useMemo(() => buildInformationTextGroupStyle(scale, insets.bottom), [scale, insets.bottom]);

  return (
    <View style={contentStyle}>
      {icon}
      <View style={textGroupStyle}>
        <Text variant="title" style={CENTER_TEXT}>{title}</Text>
        {description}
      </View>
    </View>
  );
}
