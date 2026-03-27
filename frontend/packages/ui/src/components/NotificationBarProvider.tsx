"use client";

import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationBarContext } from "./NotificationBarContext";
import { NotificationBarRenderer } from "./NotificationBarRenderer";
import { useNotificationBarStack } from "./useNotificationBarStack";
import { setNotificationBarGlobalRef, clearNotificationBarGlobalRef } from "./notificationBarRef";

export function NotificationBarProvider(props: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { activeItem, isVisible, show, hide, onHideComplete } = useNotificationBarStack();

  const actions = useMemo(() => ({ show, hide }), [show, hide]);

  useEffect(() => {
    setNotificationBarGlobalRef(actions);
    return clearNotificationBarGlobalRef;
  }, [actions]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <NotificationBarRenderer activeItem={activeItem} isVisible={isVisible} onHideComplete={onHideComplete} />
      <NotificationBarContext.Provider value={actions}>
        <View style={{ flex: 1 }}>{props.children}</View>
      </NotificationBarContext.Provider>
    </View>
  );
}
