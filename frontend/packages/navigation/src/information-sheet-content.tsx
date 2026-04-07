import type { ReactNode } from "react";
import { useMemo } from "react";
import { View } from "react-native";
import { Text, useTheme } from "@ion/ui";
import { buildInformationContentStyle, buildInformationTextGroupStyle } from "./information-sheet-styles";

const CENTER_TEXT = { textAlign: "center" } as const;

interface InformationSheetContentProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  topPadding?: number;
}

export function InformationSheetContent({ icon, title, description, topPadding }: InformationSheetContentProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const contentStyle = useMemo(() => buildInformationContentStyle(scale, topPadding), [scale, topPadding]);
  const textGroupStyle = useMemo(() => buildInformationTextGroupStyle(scale), [scale]);

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
