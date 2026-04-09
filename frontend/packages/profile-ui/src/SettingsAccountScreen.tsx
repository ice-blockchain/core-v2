import { useMemo, useState, useCallback } from "react";
import { ScrollView } from "react-native";
import { useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";
import { useReportSettingsContentHeight, Routes } from "@ion/navigation";
import { translate } from "@ion/localization";
import { PROFILE_NAMESPACE } from "./translations";
import { SettingsTile } from "./SettingsTile";

const NS = PROFILE_NAMESPACE;

interface AccountTileConfig {
  labelKey: string;
  iconName: IconName;
  colorType: "accent" | "danger";
  valueLabel?: string;
  rightType?: "arrow" | "checkbox";
}

const STATIC_TILES: readonly AccountTileConfig[] = [
  { labelKey: `${NS}:accountEditProfile`, iconName: "profile-user", colorType: "accent" },
  { labelKey: `${NS}:accountBlockedUsers`, iconName: "user-block", colorType: "accent" },
  { labelKey: `${NS}:accountVideoAutoplay`, iconName: "settings-autoplay", colorType: "accent", rightType: "checkbox" },
  { labelKey: `${NS}:accountAppearance`, iconName: "settings-appearance", colorType: "accent", valueLabel: "Light" },
  { labelKey: `${NS}:accountDappLanguage`, iconName: "select-language", colorType: "accent", valueLabel: "English" },
  { labelKey: `${NS}:accountContentLanguage`, iconName: "select-language", colorType: "accent", valueLabel: "English" },
  { labelKey: `${NS}:accountDeleteAccount`, iconName: "block-delete", colorType: "danger" },
];

export function SettingsAccountScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const [autoplay, setAutoplay] = useState(true);
  const toggleAutoplay = useCallback(() => setAutoplay((prev) => !prev), []);
  const onContentSize = useReportSettingsContentHeight(Routes.Settings.Account);

  return (
    <ScrollView contentContainerStyle={contentStyle} onContentSizeChange={onContentSize}>
      {STATIC_TILES.map((tile) => (
        <SettingsTile
          key={tile.labelKey}
          iconName={tile.iconName}
          iconColor={tile.colorType === "danger" ? theme.colors.attentionRed : theme.colors.primaryAccent}
          label={translate(tile.labelKey)}
          valueLabel={tile.valueLabel}
          rightType={tile.rightType}
          checked={tile.rightType === "checkbox" ? autoplay : undefined}
          onPress={tile.rightType === "checkbox" ? toggleAutoplay : noop}
        />
      ))}
    </ScrollView>
  );
}

function buildContentStyle(scale: (n: number) => number) {
  return { paddingHorizontal: scale(16), gap: scale(16), paddingBottom: scale(24) };
}

function noop() {}
