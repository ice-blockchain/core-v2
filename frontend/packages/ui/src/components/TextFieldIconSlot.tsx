import { View } from "react-native";
import type { ScaleFunctions } from "../scaling/scaling-types";

export interface TextFieldIconSlotProps {
  icon: React.ReactNode;
  position: "prefix" | "suffix";
  hasDivider?: boolean;
  scale: ScaleFunctions;
  dividerColor: string;
}

const ICON_SIZE = 24;
const DIVIDER_HEIGHT = 26;
const DIVIDER_MARGIN = 16;

export function TextFieldIconSlot(props: TextFieldIconSlotProps) {
  const { icon, position, hasDivider = false, scale, dividerColor } = props;
  const iconSize = scale.scaleSize(ICON_SIZE);

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {position === "suffix" && hasDivider && (
        <Divider scale={scale} color={dividerColor} />
      )}
      <View style={{ width: iconSize, height: iconSize, justifyContent: "center", alignItems: "center" }}>
        {icon}
      </View>
      {position === "prefix" && hasDivider && (
        <Divider scale={scale} color={dividerColor} />
      )}
    </View>
  );
}

function Divider({ scale, color }: { scale: ScaleFunctions; color: string }) {
  return (
    <View
      style={{
        width: 1,
        height: scale.scaleSize(DIVIDER_HEIGHT),
        backgroundColor: color,
        marginHorizontal: scale.scaleSize(DIVIDER_MARGIN),
      }}
    />
  );
}
