import { useCallback } from "react";
import type { SharedValue, AnimatedStyle } from "react-native-reanimated";
import { OverlayMenu, useOverlayMenu } from "@ion/ui";
import { ProfileNavBar } from "./ProfileNavBar";
import { ProfileSettingsMenu } from "./ProfileSettingsMenu";
import type { ProfileData } from "./profile-types";

const MENU_WIDTH = 162;

interface ProfileNavBarWithMenuProps {
  showBackButton: boolean;
  profile: ProfileData;
  collapsedHeaderOpacity: SharedValue<number>;
  navBarBgAnimatedStyle: AnimatedStyle;
  onBackPress?: () => void;
}

export function ProfileNavBarWithMenu(props: ProfileNavBarWithMenuProps) {
  const { showBackButton, profile, collapsedHeaderOpacity, navBarBgAnimatedStyle, onBackPress } = props;
  const menu = useOverlayMenu();
  const handleItemPress = useCallback((_key: string) => { menu.close(); }, [menu.close]);

  return (
    <>
      <ProfileNavBar showBackButton={showBackButton} profile={profile}
        collapsedHeaderOpacity={collapsedHeaderOpacity} navBarBgAnimatedStyle={navBarBgAnimatedStyle}
        {...(onBackPress ? { onBackPress } : {})} onMorePress={menu.toggle} moreButtonRef={menu.anchorRef} />
      <OverlayMenu isVisible={menu.isOpen} onClose={menu.close} anchorRef={menu.anchorRef} width={MENU_WIDTH}>
        <ProfileSettingsMenu onItemPress={handleItemPress} />
      </OverlayMenu>
    </>
  );
}
