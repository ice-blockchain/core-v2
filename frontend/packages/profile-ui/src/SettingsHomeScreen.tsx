import { useCallback, useMemo } from "react";
import { ScrollView } from "react-native";
import { Text, useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSettingsNavigation, useReportSettingsContentHeight, Routes } from "@ion/navigation";

import { PROFILE_NAMESPACE } from "./translations";
import { SettingsTile } from "./SettingsTile";

const NS = PROFILE_NAMESPACE;

interface TileConfig {
  labelKey: string;
  iconName: IconName;
  colorType: "accent" | "danger";
}

const TILES: readonly TileConfig[] = [
  { labelKey: `${NS}:settingsAccount`, iconName: "profile-user", colorType: "accent" },
  { labelKey: `${NS}:settingsSecurity`, iconName: "security-shield-user", colorType: "accent" },
  { labelKey: `${NS}:settingsPrivacy`, iconName: "profile-privacy", colorType: "accent" },
  { labelKey: `${NS}:settingsPushNotifications`, iconName: "notification-bell", colorType: "accent" },
  { labelKey: `${NS}:settingsPrivacyPolicy`, iconName: "profile-privacypolicy", colorType: "accent" },
  { labelKey: `${NS}:settingsTermsConditions`, iconName: "profile-terms", colorType: "accent" },
  { labelKey: `${NS}:settingsFeedback`, iconName: "settings-feedback", colorType: "accent" },
  { labelKey: `${NS}:settingsLogout`, iconName: "menu-logout", colorType: "danger" },
];

export function SettingsHomeScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const navigation = useSettingsNavigation();
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const versionStyle = useMemo(() => ({ marginTop: scale(4), textAlign: "center" as const }), [scale]);
  const goToAccount = useCallback(() => navigation.navigate(Routes.Settings.Account), [navigation]);
  const onContentSize = useReportSettingsContentHeight(Routes.Settings.Home);

  return (
    <ScrollView contentContainerStyle={contentStyle} onContentSizeChange={onContentSize}>
      {TILES.map((tile) => (
        <SettingsTile
          key={tile.labelKey}
          iconName={tile.iconName}
          iconColor={tile.colorType === "danger" ? theme.colors.attentionRed : theme.colors.primaryAccent}
          label={translate(tile.labelKey)}
          onPress={tile.labelKey === `${NS}:settingsAccount` ? goToAccount : noop}
        />
      ))}
      <Text variant="caption3" color={theme.colors.quaternaryText} style={versionStyle}>
        {translate(`${NS}:settingsVersion`)}
      </Text>
    </ScrollView>
  );
}

function buildContentStyle(scale: (n: number) => number) {
  return {
    paddingHorizontal: scale(16),
    gap: scale(9),
    paddingBottom: scale(24),
  };
}

function noop() {}
