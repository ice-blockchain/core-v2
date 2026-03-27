"use client";

import { useEffect, useMemo } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationBarContext } from "./NotificationBarContext";
import { NotificationBarRenderer } from "./NotificationBarRenderer";
import { buildWebFixedContainerStyle, buildWebBarWrapperStyle } from "./NotificationBarStyles";
import { useNotificationBarStack } from "./useNotificationBarStack";
import { setNotificationBarGlobalRef } from "./notificationBarRef";

const isWeb = Platform.OS === "web";
const webFixedContainerStyle = isWeb ? buildWebFixedContainerStyle() : null;
const webBarWrapperStyle = isWeb ? buildWebBarWrapperStyle() : null;

export function NotificationBarProvider(props: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { activeItem, isVisible, show, hide, onHideComplete } = useNotificationBarStack();

  const actions = useMemo(() => ({ show, hide }), [show, hide]);

  useEffect(() => {
    return setNotificationBarGlobalRef(actions);
  }, [actions]);

  const renderer = <NotificationBarRenderer activeItem={activeItem} isVisible={isVisible} onHideComplete={onHideComplete} />;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {isWeb ? (
        <View style={webFixedContainerStyle!} pointerEvents="box-none">
          <View style={webBarWrapperStyle!}>{renderer}</View>
        </View>
      ) : (
        renderer
      )}
      <NotificationBarContext.Provider value={actions}>
        <View style={{ flex: 1 }}>{props.children}</View>
      </NotificationBarContext.Provider>
    </View>
  );
}
