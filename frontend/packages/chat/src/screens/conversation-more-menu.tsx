import { useCallback, useEffect, useMemo } from "react";
import { Modal, Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { ContextMenuItem } from "../components/context-menu-item";
import { MuteIcon } from "../icons/MuteIcon";
import { BlockIcon } from "../icons/BlockIcon";
import { TrashIcon } from "../icons/TrashIcon";

const MENU_WIDTH = 131;
const ICON_SIZE = 20;
const ANIMATION_DURATION = 300;
const OVERSHOOT = 1.7;

interface ConversationMoreMenuProps {
  readonly isVisible: boolean;
  readonly anchorTop: number;
  readonly onClose: () => void;
  readonly onMute: () => void;
  readonly onBlock: () => void;
  readonly onDelete: () => void;
}

function useMenuAnimation(isVisible: boolean) {
  const scaleValue = useSharedValue(0);

  useEffect(() => {
    const timing = isVisible
      ? withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.back(OVERSHOOT)) })
      : withTiming(0, { duration: 200, easing: Easing.in(Easing.back(OVERSHOOT)) });
    scaleValue.value = timing;
  }, [isVisible, scaleValue]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scaleValue.value }], opacity: scaleValue.value }), [scaleValue]);
}

function buildBackdropStyle(): ViewStyle {
  return { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent" };
}

function buildMenuCardStyle(scale: (n: number) => number, bgColor: string, top: number): ViewStyle {
  return {
    position: "absolute",
    top,
    right: scale(16),
    width: scale(MENU_WIDTH),
    backgroundColor: bgColor,
    borderRadius: scale(16),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden",
  };
}

function MoreMenuItems({ onClose, onMute, onBlock, onDelete }: Omit<ConversationMoreMenuProps, "isVisible" | "anchorTop">) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const iconSize = scale(ICON_SIZE);

  const handleAction = useCallback(
    (action: () => void) => () => { onClose(); action(); },
    [onClose],
  );

  return (
    <>
      <ContextMenuItem label={translate("chat:muteAction")} icon={<MuteIcon size={iconSize} color={theme.colors.primaryText} />} onPress={handleAction(onMute)} />
      <ContextMenuItem label={translate("chat:blockAction")} icon={<BlockIcon size={iconSize} color={theme.colors.primaryText} />} onPress={handleAction(onBlock)} />
      <ContextMenuItem label={translate("chat:deleteAction")} icon={<TrashIcon size={iconSize} color={theme.colors.attentionRed} />} onPress={handleAction(onDelete)} isDanger isLast />
    </>
  );
}

export function ConversationMoreMenu({ isVisible, anchorTop, onClose, onMute, onBlock, onDelete }: ConversationMoreMenuProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const animatedStyle = useMenuAnimation(isVisible);
  const backdropStyle = useMemo(() => buildBackdropStyle(), []);
  const menuCardStyle = useMemo(
    () => buildMenuCardStyle(scale, theme.colors.secondaryBackground, anchorTop),
    [scale, theme.colors.secondaryBackground, anchorTop],
  );

  if (!isVisible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Pressable style={backdropStyle} onPress={onClose} />
      <Animated.View style={[menuCardStyle, animatedStyle]}>
        <MoreMenuItems onClose={onClose} onMute={onMute} onBlock={onBlock} onDelete={onDelete} />
      </Animated.View>
    </Modal>
  );
}
