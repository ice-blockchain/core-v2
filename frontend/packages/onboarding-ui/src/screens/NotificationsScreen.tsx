import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { ViewStyle } from "react-native";
import { Button, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { requestNotificationPermission } from "@ion/onboarding";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetNavigation, useSheetScroll, Routes, Sheet } from "@ion/navigation";
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
  const insets = useSafeAreaInsets();

  return {
    container: useMemo(() => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }), [theme.colors]),
    screenContent: useMemo(() => buildScreenContentStyle(scale), [scale]),
    cardsContainer: useMemo(() => buildCardsContainerStyle(scale), [scale]),
    cardsInner: useMemo(() => buildCardsInnerStyle(scale), [scale]),
    descriptions: useMemo(() => buildDescriptionsContainerStyle(scale), [scale]),
    footerSpacer: useMemo(() => ({ height: scale(80) }), [scale]),
    floatingFooter: useMemo((): ViewStyle => ({
      position: "absolute",
      bottom: scale(10) + insets.bottom,
      left: 0,
      right: 0,
      paddingHorizontal: scale(16),
    }), [scale, insets.bottom]),
  };
}

function NotificationCards({ innerStyle }: { innerStyle: ReturnType<typeof buildCardsInnerStyle> }) {
  return (
    <View style={innerStyle}>
      <NotificationCard avatar={avatarReceivedIon} title={translate("onboarding:receivedIonTitle")} description={translate("onboarding:receivedIonDescription")} time={translate("onboarding:receivedIonTime")} showBadge testID="notification-received-ion" />
      <NotificationCard avatar={avatarNewFollower} title={translate("onboarding:newFollowerTitle")} description={translate("onboarding:newFollowerDescription")} time={translate("onboarding:newFollowerTime")} testID="notification-new-follower" />
      <NotificationCard avatar={avatarNewMessage} title={translate("onboarding:newMessageTitle")} description={translate("onboarding:newMessageDescription")} time={translate("onboarding:newMessageTime")} testID="notification-new-message" />
    </View>
  );
}

function NotificationDescriptions({ style }: { style: ReturnType<typeof buildDescriptionsContainerStyle> }) {
  return (
    <View style={style}>
      <DescriptionItem iconName="button-receive" text={translate("onboarding:notificationDescriptionAssets")} testID="description-receive" />
      <DescriptionItem iconName="articles" text={translate("onboarding:notificationDescriptionNews")} testID="description-news" />
      <DescriptionItem iconName="chat-off" text={translate("onboarding:notificationDescriptionChat")} testID="description-chat" />
    </View>
  );
}

function NotificationsContent({ styles }: { styles: ReturnType<typeof useScreenStyles> }) {
  return (
    <View style={styles.screenContent}>
      <OnboardingScreenTitle title={translate("onboarding:notificationsTitle")} subtitle={translate("onboarding:notificationsSubtitle")} />
      <View style={styles.cardsContainer}>
        <NotificationCards innerStyle={styles.cardsInner} />
      </View>
      <NotificationDescriptions style={styles.descriptions} />
      <View style={styles.footerSpacer} />
    </View>
  );
}

export function NotificationsScreen() {
  const navigation = useSheetNavigation();
  const styles = useScreenStyles();
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(async () => {
    try { await requestNotificationPermission(); } catch { /* user denied or unavailable — proceed anyway */ }
    navigation.reset({ index: 0, routes: [{ name: Routes.Catalog }] });
  }, [navigation]);

  const sheetScroll = useSheetScroll();

  return (
    <Sheet onClose={handleBack} title={translate("onboarding:notificationsTitle")}>
      <View style={styles.container} testID="notifications-screen">
        <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16}>
          <NotificationsContent styles={styles} />
        </BottomSheetScrollView>
        <View style={styles.floatingFooter}>
          <Button label={translate("onboarding:continueButton")} onPress={handleContinue} />
        </View>
      </View>
    </Sheet>
  );
}
