import { Fragment } from "react";
import { View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { HorizontalSeparator } from "./HorizontalSeparator";
import { BottomNavBarSheetActionRow } from "./BottomNavBarSheetActionRow";
import { useTheme } from "../theme/ThemeProvider";
import type { BottomNavBarSheetProps } from "./bottom-nav-bar-types";

export function BottomNavBarSheet({ isVisible, onClose, title, actions, inline, testID }: BottomNavBarSheetProps) {
  const scale = useTheme().scale.scaleSize;

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title={title} {...(inline ? { inline } : {})} {...(testID ? { testID } : {})}>
      <View style={{ gap: scale(12) }}>
        {actions.map((action, index) => (
          <Fragment key={action.iconName}>
            {index > 0 ? <HorizontalSeparator /> : null}
            <BottomNavBarSheetActionRow action={action} />
          </Fragment>
        ))}
      </View>
    </BottomSheet>
  );
}
