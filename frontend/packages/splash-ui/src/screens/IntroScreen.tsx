import { useCallback } from "react";
import { translate } from "@ion/localization";
import { useAppNavigation, Routes } from "@ion/navigation";
import { Button, Icon, useTheme } from "@ion/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";

export function IntroScreen() {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  const handleLogin = useCallback(() => {
    navigation.navigate(Routes.Sheet.ProfileSetup);
  }, [navigation]);

  return (
    <View style={{paddingBottom: insets.bottom + scale(20), width: '80%'}}>
      <Button
        label={"Log In"}
        icon={<Icon name="button-next" size={scale(24)} color={theme.colors.onPrimaryAccent} />}
        iconPosition="right"
        height={56}
        onPress={handleLogin}
      />
    </View>
  );
}
