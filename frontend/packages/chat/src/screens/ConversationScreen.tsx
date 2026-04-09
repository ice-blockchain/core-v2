import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { chatEncryptedImage, chatEncryptedDarkImage } from "./chat-images";
import { ConversationHeader } from "./conversation-header";
import { ConversationChatBar } from "./conversation-chat-bar";
import { ConversationMoreMenu } from "./conversation-more-menu";
import { PrivacyInfoSheet } from "./privacy-info-sheet";
import {
  buildConversationScreenStyle,
  buildConversationContentStyle,
  buildDatePillStyle,
  buildEmptyStateContainerStyle,
  buildEmptyStateInnerStyle,
  buildEncryptedImageStyle,
  buildCenteredTextStyle,
} from "./conversation-screen-styles";

function useConversationStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return {
    content: useMemo(() => buildConversationContentStyle(theme.colors.primaryBackground), [theme.colors.primaryBackground]),
    datePill: useMemo(() => buildDatePillStyle(scale, theme.colors.secondaryBackground), [scale, theme.colors.secondaryBackground]),
    emptyState: useMemo(() => buildEmptyStateContainerStyle(scale), [scale]),
    emptyStateInner: useMemo(() => buildEmptyStateInnerStyle(scale), [scale]),
    encryptedImage: useMemo(() => buildEncryptedImageStyle(scale), [scale]),
    centeredText: useMemo(() => buildCenteredTextStyle(), []),
  };
}

function DatePill() {
  const theme = useTheme();
  const styles = useConversationStyles();

  return (
    <View style={styles.datePill}>
      <Text variant="caption3" color={theme.colors.onTertiaryBackground}>
        {translate("chat:today")}
      </Text>
    </View>
  );
}

function EmptyConversationBody({ onLearnMore }: { readonly onLearnMore: () => void }) {
  const theme = useTheme();
  const styles = useConversationStyles();
  const encryptedIcon = theme.colorMode === "dark" ? chatEncryptedDarkImage : chatEncryptedImage;

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateInner}>
        <Image source={encryptedIcon} style={styles.encryptedImage} />
        <Text variant="caption2" color={theme.colors.onTertiaryBackground} style={styles.centeredText}>
          {translate("chat:encryptedMessage")}
        </Text>
      </View>
      <Pressable onPress={onLearnMore}>
        <Text variant="caption" color={theme.colors.primaryAccent}>
          {translate("chat:learnMore")}
        </Text>
      </Pressable>
    </View>
  );
}

interface ConversationScreenProps {
  readonly name: string;
  readonly username: string | undefined;
  readonly avatarUrl: string | undefined;
  readonly isVerified: boolean | undefined;
  readonly onBack: () => void;
}

function noop() { /* placeholder for future implementation */ }

export function ConversationScreen({ name, username, avatarUrl, isVerified, onBack }: ConversationScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scale = theme.scale.scaleSize;
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isPrivacySheetVisible, setIsPrivacySheetVisible] = useState(false);
  const menuAnchorTop = insets.top + scale(48) + scale(4);

  const handleMorePress = useCallback(() => setIsMenuVisible(true), []);
  const handleMenuClose = useCallback(() => setIsMenuVisible(false), []);
  const handleLearnMore = useCallback(() => setIsPrivacySheetVisible(true), []);
  const handlePrivacyClose = useCallback(() => setIsPrivacySheetVisible(false), []);

  const screenStyle = useMemo(
    () => [buildConversationScreenStyle(theme.colors.secondaryBackground), { paddingTop: insets.top, paddingBottom: insets.bottom }],
    [theme.colors.secondaryBackground, insets.top, insets.bottom],
  );

  return (
    <View style={screenStyle} testID="conversation-screen">
      <ConversationHeader name={name} username={username} avatarUrl={avatarUrl} isVerified={isVerified} onBack={onBack} onMorePress={handleMorePress} />
      <View style={useConversationStyles().content}>
        <DatePill />
        <EmptyConversationBody onLearnMore={handleLearnMore} />
      </View>
      <ConversationChatBar />
      <ConversationMoreMenu isVisible={isMenuVisible} anchorTop={menuAnchorTop} onClose={handleMenuClose} onMute={noop} onBlock={noop} onDelete={noop} />
      <PrivacyInfoSheet isVisible={isPrivacySheetVisible} onClose={handlePrivacyClose} />
    </View>
  );
}
