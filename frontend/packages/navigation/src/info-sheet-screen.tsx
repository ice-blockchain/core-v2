import type { ReactNode } from "react";
import type { IconName } from "@ion/ui";
import { Icon, useTheme } from "@ion/ui";
import { DynamicSheet } from "./DynamicSheet";
import { InformationSheetContent } from "./information-sheet-content";

interface InfoSheetScreenProps {
  headerTitle: string;
  iconName: IconName;
  iconColor?: string;
  title: string;
  description: ReactNode;
}

export function InfoSheetScreen({ headerTitle, iconName, iconColor, title, description }: InfoSheetScreenProps) {
  const { scale } = useTheme();
  const scaleSize = scale.scaleSize;

  return (
    <DynamicSheet title={headerTitle}>
      <InformationSheetContent
        icon={<Icon name={iconName} size={scaleSize(80)} {...(iconColor ? { color: iconColor } : {})} />}
        title={title}
        description={description}
      />
    </DynamicSheet>
  );
}
