import { useAppNavigation, Routes } from "@ion/navigation";
import { translate } from "@ion/localization";
import { Button, Icon, useTheme } from "@ion/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";

export function IntroScreen() {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  return (
    <View style={{paddingBottom: insets.bottom + scale(20), width: '80%'}}>
      <Button
        label={translate("splash:logInButton")}
        icon={<Icon name="button-next" size={scale(24)} color={theme.colors.onPrimaryAccent} />}
        iconPosition="right"
        height={56}
        onPress={() => navigation.navigate(Routes.Sheet.Auth)}
      />
      <View style={{marginTop: scale(12)}}>
        <Button
          label={translate("splash:mainScreenButton")}
          icon={<Icon name="button-next" size={scale(24)} color={theme.colors.onPrimaryAccent} />}
          iconPosition="right"
          height={56}
          onPress={() => navigation.navigate(Routes.Main)}
        />
      </View>
    </View>
  );
}
