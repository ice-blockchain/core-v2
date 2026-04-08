import { StyleSheet } from "react-native";

export const TAB_BAR_HEIGHT = 48;
export const INDICATOR_HEIGHT = 2;
export const ICON_SIZE = 18;
export const ICON_LABEL_GAP = 6;
export const TAB_BOTTOM_PADDING = 8;
export const BAR_HORIZONTAL_PADDING = 6;
export const TAB_LABEL_HORIZONTAL_PADDING = 10;

export const tabBarStyles = StyleSheet.create({
  container: {
    height: TAB_BAR_HEIGHT,
    justifyContent: "flex-end",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: BAR_HORIZONTAL_PADDING,
  },
  tabItem: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: TAB_LABEL_HORIZONTAL_PADDING,
    paddingBottom: TAB_BOTTOM_PADDING,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: ICON_LABEL_GAP,
  },
  indicatorTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: INDICATOR_HEIGHT,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: INDICATOR_HEIGHT,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});
