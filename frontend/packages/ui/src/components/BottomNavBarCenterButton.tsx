import { Pressable } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { LogoButton } from "./LogoButton";
import { LogoButtonClose } from "./LogoButtonClose";
import { buildCenterSlotStyle } from "./bottom-nav-bar-styles";

interface BottomNavBarCenterButtonProps {
  isModalOpen: boolean;
  onPress: () => void;
}

const CENTER_SLOT_STYLE = buildCenterSlotStyle();

export function BottomNavBarCenterButton({ isModalOpen, onPress }: BottomNavBarCenterButtonProps) {
  const scale = useTheme().scale.scaleSize;
  const logoSize = scale(50);

  return (
    <Pressable style={CENTER_SLOT_STYLE} onPress={onPress} accessibilityRole="button">
      {isModalOpen ? <LogoButtonClose size={logoSize} /> : <LogoButton size={logoSize} />}
    </Pressable>
  );
}
