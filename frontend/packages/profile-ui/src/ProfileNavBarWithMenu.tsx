import { useCallback, useState } from "react";
import type { SharedValue, AnimatedStyle } from "react-native-reanimated";
import { OverlayMenu, useOverlayMenu } from "@ion/ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { ProfileNavBar } from "./ProfileNavBar";
import { ProfileSettingsMenu } from "./ProfileSettingsMenu";
import { PROFILE_NAMESPACE } from "./translations";
import type { ProfileData } from "./profile-types";

const MENU_WIDTH = 162;
const SETTINGS_KEY = `${PROFILE_NAMESPACE}:menuSettings`;

interface ProfileNavBarWithMenuProps {
  showBackButton: boolean;
  profile: ProfileData;
  collapsedHeaderOpacity: SharedValue<number>;
  navBarBgAnimatedStyle: AnimatedStyle;
  onBackPress?: () => void;
}

function useSettingsMenuHandler(menu: ReturnType<typeof useOverlayMenu>) {
  const navigation = useAppNavigation();
  const [menuMounted, setMenuMounted] = useState(true);

  const handleItemPress = useCallback((key: string) => {
    if (key === SETTINGS_KEY) {
      setMenuMounted(false);
      menu.close();
      requestAnimationFrame(() => navigation.navigate(Routes.Sheet.Settings));
      return;
    }
    menu.close();
  }, [menu.close, navigation]);

  const handleMenuToggle = useCallback(() => {
    setMenuMounted(true);
    menu.toggle();
  }, [menu.toggle]);

  return { menuMounted, handleItemPress, handleMenuToggle };
}

export function ProfileNavBarWithMenu(props: ProfileNavBarWithMenuProps) {
  const { showBackButton, profile, collapsedHeaderOpacity, navBarBgAnimatedStyle, onBackPress } = props;
  const menu = useOverlayMenu();
  const { menuMounted, handleItemPress, handleMenuToggle } = useSettingsMenuHandler(menu);

  return (
    <>
      <ProfileNavBar showBackButton={showBackButton} profile={profile}
        collapsedHeaderOpacity={collapsedHeaderOpacity} navBarBgAnimatedStyle={navBarBgAnimatedStyle}
        {...(onBackPress ? { onBackPress } : {})} onMorePress={handleMenuToggle} moreButtonRef={menu.anchorRef} />
      {menuMounted && (
        <OverlayMenu isVisible={menu.isOpen} onClose={menu.close} anchorRef={menu.anchorRef} width={MENU_WIDTH}>
          <ProfileSettingsMenu onItemPress={handleItemPress} />
        </OverlayMenu>
      )}
    </>
  );
}
