import { useCallback, useEffect, useMemo } from "react";
import { Dimensions, Modal, Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { ContextMenuItem } from "./context-menu-item";
import { ConversationRow } from "./conversation-row";
import { ChatArchiveIcon } from "../icons/ChatArchiveIcon";
import { MuteIcon } from "../icons/MuteIcon";
import { BlockIcon } from "../icons/BlockIcon";
import { TrashIcon } from "../icons/TrashIcon";
import type { Conversation } from "../types";
import type { ContextMenuState } from "./context-menu-types";

type ScaleFunction = (n: number) => number;

const ANIMATION_DURATION = 300;
const OVERSHOOT = 1.7;
const MENU_WIDTH = 180;
const MENU_GAP = 4;
const ICON_SIZE = 20;
const ROW_PAD_H = 12;
const ROW_PAD_V = 2;

interface ConversationContextMenuProps {
  readonly state: ContextMenuState | null;
  readonly onClose: () => void;
  readonly onArchive: (conversation: Conversation) => void;
  readonly onMute: (conversation: Conversation) => void;
  readonly onBlock: (conversation: Conversation) => void;
  readonly onDelete: (conversation: Conversation) => void;
}

function buildBackdropStyle(color: string): ViewStyle {
  return { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color };
}

function buildCardBackgroundStyle(scale: ScaleFunction, layout: ContextMenuState["layout"], bgColor: string): ViewStyle {
  const padH = scale(ROW_PAD_H);
  const padV = scale(ROW_PAD_V);
  return {
    position: "absolute",
    top: layout.y - padV,
    left: layout.x - padH,
    width: layout.width + padH * 2,
    height: layout.height + padV * 2,
    backgroundColor: bgColor,
    borderRadius: scale(16),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  };
}

function buildRowOverlayStyle(layout: ContextMenuState["layout"]): ViewStyle {
  return { position: "absolute", top: layout.y, left: layout.x, width: layout.width };
}

function computeMenuPosition(layout: ContextMenuState["layout"], scale: ScaleFunction): { top: number; left: number } {
  const screen = Dimensions.get("window");
  const menuWidth = scale(MENU_WIDTH);
  const padH = scale(ROW_PAD_H);
  const padV = scale(ROW_PAD_V);
  const left = layout.x + layout.width + padH - menuWidth;
  const menuTop = layout.y + layout.height + padV + scale(MENU_GAP);
  const estimatedMenuHeight = scale(200);
  if (menuTop + estimatedMenuHeight > screen.height - scale(40)) {
    return { top: layout.y - padV - estimatedMenuHeight - scale(MENU_GAP), left };
  }
  return { top: menuTop, left };
}

function buildMenuCardStyle(scale: ScaleFunction, bgColor: string): ViewStyle {
  return {
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

function useMenuAnimation(isVisible: boolean) {
  const scaleValue = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      scaleValue.value = withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.back(OVERSHOOT)) });
    } else {
      scaleValue.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.back(OVERSHOOT)) });
    }
  }, [isVisible, scaleValue]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scaleValue.value }], opacity: scaleValue.value }), [scaleValue]);
}

interface MenuItemsProps {
  readonly conversation: Conversation;
  readonly onClose: () => void;
  readonly onArchive: (conversation: Conversation) => void;
  readonly onMute: (conversation: Conversation) => void;
  readonly onBlock: (conversation: Conversation) => void;
  readonly onDelete: (conversation: Conversation) => void;
}

function MenuItems({ conversation, onClose, onArchive, onMute, onBlock, onDelete }: MenuItemsProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const iconSize = scale(ICON_SIZE);

  const handleAction = (action: (c: Conversation) => void) => () => { onClose(); action(conversation); };

  return (
    <>
      <ContextMenuItem label={translate("chat:addToArchiveAction")} icon={<ChatArchiveIcon size={iconSize} color={theme.colors.secondaryText} />} onPress={handleAction(onArchive)} />
      <ContextMenuItem label={translate("chat:muteAction")} icon={<MuteIcon size={iconSize} color={theme.colors.secondaryText} />} onPress={handleAction(onMute)} />
      <ContextMenuItem label={translate("chat:blockAction")} icon={<BlockIcon size={iconSize} color={theme.colors.secondaryText} />} onPress={handleAction(onBlock)} />
      <ContextMenuItem label={translate("chat:deleteAction")} icon={<TrashIcon size={iconSize} color={theme.colors.attentionRed} />} onPress={handleAction(onDelete)} isDanger isLast />
    </>
  );
}

export function ConversationContextMenu({ state, onClose, onArchive, onMute, onBlock, onDelete }: ConversationContextMenuProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const animatedStyle = useMenuAnimation(state !== null);
  const handleBackdrop = useCallback(() => onClose(), [onClose]);

  const backdropStyle = useMemo(() => buildBackdropStyle(theme.colors.backgroundSheet), [theme.colors.backgroundSheet]);
  const menuCardStyle = useMemo(() => buildMenuCardStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]);
  const cardBgStyle = useMemo(
    () => (state ? buildCardBackgroundStyle(scale, state.layout, theme.colors.secondaryBackground) : null),
    [scale, state, theme.colors.secondaryBackground],
  );
  const rowOverlayStyle = useMemo(() => (state ? buildRowOverlayStyle(state.layout) : null), [state]);
  const menuPosition = useMemo(() => (state ? computeMenuPosition(state.layout, scale) : null), [state, scale]);

  if (!state || !cardBgStyle || !rowOverlayStyle || !menuPosition) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Pressable style={backdropStyle} onPress={handleBackdrop} />
      <View style={cardBgStyle} pointerEvents="none" />
      <View style={rowOverlayStyle} pointerEvents="none">
        <ConversationRow conversation={state.conversation} />
      </View>
      <Animated.View style={[menuCardStyle, { position: "absolute", top: menuPosition.top, left: menuPosition.left }, animatedStyle]}>
        <MenuItems conversation={state.conversation} onClose={onClose} onArchive={onArchive} onMute={onMute} onBlock={onBlock} onDelete={onDelete} />
      </Animated.View>
    </Modal>
  );
}
