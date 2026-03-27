import { useMemo } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import {
  buildNotificationBarContainerStyle,
  buildNotificationBarContentStyle,
  buildNotificationBarTextStyle,
} from "./NotificationBarStyles";

interface NotificationBarContentProps {
  message: string;
  icon?: React.ReactNode;
  suffixAction?: React.ReactNode;
  backgroundColor: string;
}

export function NotificationBarContent(props: NotificationBarContentProps) {
  const { message, icon, suffixAction, backgroundColor } = props;
  const theme = useTheme();
  const hasSuffixAction = suffixAction != null;

  const containerStyle = useMemo(
    () => buildNotificationBarContainerStyle({ backgroundColor, theme }),
    [backgroundColor, theme],
  );

  const contentStyle = useMemo(
    () => buildNotificationBarContentStyle({ theme, hasSuffixAction }),
    [theme, hasSuffixAction],
  );

  const textStyle = useMemo(
    () => buildNotificationBarTextStyle({ theme }),
    [theme],
  );

  return (
    <View style={containerStyle}>
      <View style={contentStyle}>
        {icon}
        <Text style={[textStyle, hasSuffixAction && { flex: 1 }]} numberOfLines={1}>{message}</Text>
        {suffixAction}
      </View>
    </View>
  );
}
