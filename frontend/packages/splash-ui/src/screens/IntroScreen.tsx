import { useCallback } from "react";
import { useAppNavigation, Routes } from "@ion/navigation";
import { translate } from "@ion/localization";
import { Button, Icon, useTheme } from "@ion/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View } from "react-native";

function DevButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button label={label} color="secondary" height={56} onPress={onPress} />;
}

export function IntroScreen() {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  const handleLogin = useCallback(() => {
    navigation.navigate(Routes.Sheet.Auth);
  }, [navigation]);

  return (
    <View style={{paddingBottom: insets.bottom + scale(20), width: '80%'}}>
      <Button
        label={translate("splash:logInButton")}
        icon={<Icon name="button-next" size={scale(24)} color={theme.colors.onPrimaryAccent} />}
        iconPosition="right"
        height={56}
        onPress={handleLogin}
      />
      <View style={{ height: scale(12) }} />
      <DevButton label="Create Post (TEST)" onPress={() => navigation.navigate(Routes.Sheet.CreatePost)} />
      <View style={{ height: scale(12) }} />
      <DevButton label="UI Catalog (TEST)" onPress={() => navigation.navigate(Routes.Catalog)} />
      {Platform.OS !== "web" && (
        <>
          <View style={{ height: scale(12) }} />
          <DevButton label="Proxy Test (TEST)" onPress={() => navigation.navigate(Routes.ProxyTest)} />
          <View style={{ height: scale(12) }} />
          <DevButton label="Storage Test (TEST)" onPress={() => navigation.navigate(Routes.StorageTest)} />
        </>
      )}
    </View>
  );
}
