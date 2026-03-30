import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheet, Button, useTheme } from "@ion/ui";
import { requestNotificationPermission } from "@ion/onboarding";
import type { OnboardingScreenProps } from "../types";
import { OnboardingScreenTitle } from "../components/OnboardingScreenTitle";
import { NotificationCard } from "../components/NotificationCard";
import { DescriptionItem } from "../components/DescriptionItem";
import { avatarReceivedIon, avatarNewFollower, avatarNewMessage } from "./notification-images";
import {
  buildScreenContentStyle,
  buildCardsContainerStyle,
  buildCardsInnerStyle,
  buildDescriptionsContainerStyle,
} from "./notifications-styles";

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return {
    screenContent: useMemo(() => buildScreenContentStyle(scale), [scale]),
    cardsContainer: useMemo(() => buildCardsContainerStyle(scale), [scale]),
    cardsInner: useMemo(() => buildCardsInnerStyle(scale), [scale]),
    descriptions: useMemo(() => buildDescriptionsContainerStyle(scale), [scale]),
    footerSpacer: useMemo(() => ({ height: scale(80) }), [scale]),
  };
}

function NotificationCards({ innerStyle }: { innerStyle: ReturnType<typeof buildCardsInnerStyle> }) {
  return (
    <View style={innerStyle}>
      <NotificationCard
        avatar={avatarReceivedIon}
        title="Received ION"
        description="You received 873 ION from @james"
        time="15m ago"
        showBadge
        testID="notification-received-ion"
      />
      <NotificationCard
        avatar={avatarNewFollower}
        title="New follower"
        description="@curtis has started following you"
        time="24m ago"
        testID="notification-new-follower"
      />
      <NotificationCard
        avatar={avatarNewMessage}
        title="New message"
        description="@marie has sent you a message"
        time="31m ago"
        testID="notification-new-message"
      />
    </View>
  );
}

function NotificationDescriptions({ style }: { style: ReturnType<typeof buildDescriptionsContainerStyle> }) {
  return (
    <View style={style}>
      <DescriptionItem
        iconName="button-receive"
        text="Receive notifications when your sending or receiving assets"
        testID="description-receive"
      />
      <DescriptionItem
        iconName="articles"
        text="Stay up to date with the latest news"
        testID="description-news"
      />
      <DescriptionItem
        iconName="chat-off"
        text="Chat and receive notifications even if the application is closed"
        testID="description-chat"
      />
    </View>
  );
}

export function NotificationsScreen({ onContinue, onBack }: OnboardingScreenProps) {
  const styles = useScreenStyles();
  const handleClose = useCallback(() => onBack?.(), [onBack]);

  const handleContinue = useCallback(async () => {
    await requestNotificationPermission();
    onContinue();
  }, [onContinue]);

  return (
    <BottomSheet
      isVisible
      onClose={handleClose}
      {...(onBack ? { onBack } : {})}
      title="Turn on notifications"
      floatingFooter={<Button label="Continue" onPress={handleContinue} />}
      testID="notifications-screen"
    >
      <View style={styles.screenContent}>
        <OnboardingScreenTitle
          title="Turn on notifications"
          subtitle="Receive notifications when you transfer and receive funds"
        />
        <View style={styles.cardsContainer}>
          <NotificationCards innerStyle={styles.cardsInner} />
        </View>
        <NotificationDescriptions style={styles.descriptions} />
        <View style={styles.footerSpacer} />
      </View>
    </BottomSheet>
  );
}
