import { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { colorPalette } from "../tokens/color-palette";
import { BottomNavBarTab } from "./BottomNavBarTab";
import { BottomNavBarCenterButton } from "./BottomNavBarCenterButton";
import { buildBarContainerStyle, buildBarRowStyle } from "./bottom-nav-bar-styles";
import type { BottomNavBarProps, BottomNavBarTabIndex } from "./bottom-nav-bar-types";

function useBarStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const bgColor = theme.colors.secondaryBackground;

  const containerStyle = useMemo(
    () => buildBarContainerStyle({ scale, bgColor, bottomInset: insets.bottom, shadowColor: colorPalette.darkBlue }),
    [scale, bgColor, insets.bottom],
  );

  const rowStyle = useMemo(() => buildBarRowStyle(scale, bgColor), [scale, bgColor]);

  return { containerStyle, rowStyle };
}

export function BottomNavBar(props: BottomNavBarProps) {
  const { activeTab, onTabPress, onCenterPress, isCenterModalOpen, tabs, testID } = props;
  const { containerStyle, rowStyle } = useBarStyles();

  return (
    <View style={containerStyle} testID={testID}>
      <View style={rowStyle}>
        <BottomNavBarTab config={tabs[0]} isSelected={activeTab === 0} onPress={() => onTabPress(0 as BottomNavBarTabIndex)} />
        <BottomNavBarTab config={tabs[1]} isSelected={activeTab === 1} onPress={() => onTabPress(1 as BottomNavBarTabIndex)} />
        <BottomNavBarCenterButton isModalOpen={isCenterModalOpen} onPress={onCenterPress} />
        <BottomNavBarTab config={tabs[2]} isSelected={activeTab === 2} onPress={() => onTabPress(2 as BottomNavBarTabIndex)} />
        <BottomNavBarTab config={tabs[3]} isSelected={activeTab === 3} onPress={() => onTabPress(3 as BottomNavBarTabIndex)} />
      </View>
    </View>
  );
}
