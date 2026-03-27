import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { SmallButton } from "../components/SmallButton";
import { useNotificationBar } from "../components/useNotificationBar";
import { IONLoader } from "../components/IONLoader";
import { CatalogSection } from "./CatalogSection";
import { Text } from "../components/Text";
import { colorPalette } from "../tokens/color-palette";
import { Icon } from "../icons/Icon";

function DemoRow({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="caption2" color={theme.colors.tertiaryText} style={{ marginBottom: theme.spacing.xs }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {children}
      </View>
    </View>
  );
}

function LoadingDemo() {
  const { show, hide } = useNotificationBar();
  return (
    <DemoRow label="Loading (permanent, orange, spinner)">
      <SmallButton
        color="primary"
        label="Show"
        onPress={() => show({
          key: "loading",
          message: "Your post is loading...",
          icon: <IONLoader variant="dark" size={16} />,
          backgroundColor: colorPalette.orangePeel,
        })}
      />
      <SmallButton color="primaryOutlined" label="Hide" onPress={() => hide("loading")} />
    </DemoRow>
  );
}

function PublishedDemo() {
  const { show } = useNotificationBar();
  const theme = useTheme();
  return (
    <DemoRow label="Published (auto-dismiss, blue, icon)">
      <SmallButton
        color="primary"
        label="Show"
        onPress={() => show({
          message: "Your post has been published",
          icon: <Icon name="check_green" size={16} color={theme.colors.onPrimaryAccent} />,
          backgroundColor: theme.colors.primaryAccent,
        })}
      />
    </DemoRow>
  );
}

function SuccessDemo() {
  const { show } = useNotificationBar();
  const theme = useTheme();
  return (
    <DemoRow label="Success (auto-dismiss, green, no icon)">
      <SmallButton
        color="primary"
        label="Show"
        onPress={() => show({
          message: "Successfully reposted",
          backgroundColor: theme.colors.success,
        })}
      />
    </DemoRow>
  );
}

function OfflineDemo() {
  const { show, hide } = useNotificationBar();
  const theme = useTheme();

  const retryButton = (
    <Pressable onPress={() => hide("offline")}>
      <Text variant="body" color={theme.colors.onPrimaryAccent}>Retry</Text>
    </Pressable>
  );

  return (
    <DemoRow label="Offline (permanent, raspberry, suffix action)">
      <SmallButton
        color="primary"
        label="Show"
        onPress={() => show({
          key: "offline",
          message: "No internet connection",
          icon: <Icon name="danger_triangle" size={16} color={theme.colors.onPrimaryAccent} />,
          suffixAction: retryButton,
          backgroundColor: colorPalette.raspberry,
        })}
      />
      <SmallButton color="primaryOutlined" label="Hide" onPress={() => hide("offline")} />
    </DemoRow>
  );
}

function SequentialDemo() {
  const { show } = useNotificationBar();
  const theme = useTheme();

  function fireSequentialNotifications() {
    show({ message: "First notification", backgroundColor: theme.colors.primaryAccent });
    setTimeout(() => show({ message: "Second notification", backgroundColor: theme.colors.success }), 200);
    setTimeout(() => show({ message: "Third notification", backgroundColor: colorPalette.orangePeel }), 400);
  }

  return (
    <DemoRow label="Sequential (3 auto-dismiss in queue)">
      <SmallButton color="primary" label="Fire 3" onPress={fireSequentialNotifications} />
    </DemoRow>
  );
}

export function NotificationBarCatalogSection() {
  return (
    <CatalogSection title="NotificationBar">
      <LoadingDemo />
      <PublishedDemo />
      <SuccessDemo />
      <OfflineDemo />
      <SequentialDemo />
    </CatalogSection>
  );
}
