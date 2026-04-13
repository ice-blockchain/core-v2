import { useMemo, useState, useCallback } from "react";
import { ScrollView } from "react-native";
import { useTheme } from "@ion/ui";
import type { IconName } from "@ion/ui";
import { useReportSettingsContentHeight, useSettingsCloseNavigation, Routes } from "@ion/navigation";
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

function useEditProfileHandler() {
  const closeAndNavigate = useSettingsCloseNavigation();
  return useCallback(() => { closeAndNavigate(Routes.EditProfile); }, [closeAndNavigate]);
}

function resolveTilePress(tile: AccountTileConfig, toggleAutoplay: () => void, handleEditProfile: () => void) {
  if (tile.rightType === "checkbox") return toggleAutoplay;
  if (tile.labelKey === `${NS}:accountEditProfile`) return handleEditProfile;
  return noop;
}

export function SettingsAccountScreen() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const contentStyle = useMemo(() => buildContentStyle(scale), [scale]);
  const [autoplay, setAutoplay] = useState(true);
  const toggleAutoplay = useCallback(() => setAutoplay((prev) => !prev), []);
  const onContentSize = useReportSettingsContentHeight(Routes.Settings.Account);
  const handleEditProfile = useEditProfileHandler();

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
          onPress={resolveTilePress(tile, toggleAutoplay, handleEditProfile)}
        />
      ))}
    </ScrollView>
  );
}

function buildContentStyle(scale: (n: number) => number) {
  return { paddingHorizontal: scale(16), gap: scale(16), paddingBottom: scale(24) };
}

function noop() {}
