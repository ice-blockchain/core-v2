import { useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Button, Icon, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { saveProfile } from "@ion/onboarding";
import { useAppNavigation, useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
import { AvatarPicker } from "../components/AvatarPicker";
import { useProfileForm } from "./profile-setup-hooks";
import { AuthHeader } from "./AuthHeader";
import { ProfileSetupFields } from "./ProfileSetupFields";
import { buildAvatarSectionStyle, buildContentContainerStyle, buildFieldsContainerStyle } from "./profile-setup-styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function useSaveHandler(
  formState: ReturnType<typeof useProfileForm>[0],
  formActions: ReturnType<typeof useProfileForm>[1],
  onSaved: () => void,
) {
  return useCallback(async () => {
    if (!formState.isFormValid) return;
    formActions.setSubmitting(true);
    try {
      const input = {
        displayName: formState.name.value,
        nickname: formState.nickname.value,
        ...(formState.referral.value ? { referredBy: formState.referral.value } : {}),
      };
      await saveProfile(input);
      onSaved();
    } finally {
      formActions.setSubmitting(false);
    }
  }, [formState, formActions, onSaved]);
}

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  return {
    container: useMemo(
      () => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }),
      [theme.colors],
    ),
    content: useMemo(() => buildContentContainerStyle(scale), [scale]),
    avatar: useMemo(() => buildAvatarSectionStyle(scale), [scale]),
    fields: useMemo(() => buildFieldsContainerStyle(scale), [scale]),
    footer: useMemo(
      (): ViewStyle => ({
        position: "absolute",
        bottom: scale(10) + insets.bottom,
        left: 0,
        right: 0,
        paddingHorizontal: scale(44),
      }),
      [scale, insets],
    ),
  };
}

function SaveButton({ formState, handleSave }: { formState: ReturnType<typeof useProfileForm>[0]; handleSave: () => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <Button
      label={translate("onboarding:saveButton")}
      icon={<Icon name="profile-save" size={scale(24)} color={theme.colors.onPrimaryAccent} />}
      iconPosition="left"
      height={56}
      isDisabled={!formState.isFormValid}
      isLoading={formState.isSubmitting}
      onPress={handleSave}
    />
  );
}

function ProfileSetupContent({ formState, formActions, styles }: {
  formState: ReturnType<typeof useProfileForm>[0];
  formActions: ReturnType<typeof useProfileForm>[1];
  styles: ReturnType<typeof useScreenStyles>;
}) {
  const sheetScroll = useSheetScroll();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <AuthHeader />
        <View style={styles.avatar}>
          <AvatarPicker isLoading={formState.isAvatarLoading} onPress={() => {}} testID="avatar-picker" />
        </View>
        <ProfileSetupFields formState={formState} formActions={formActions} style={styles.fields} />
      </View>
    </BottomSheetScrollView>
  );
}

export function ProfileSetupScreen() {
  const authNavigation = useAuthNavigation();
  const appNavigation = useAppNavigation();
  const [formState, formActions] = useProfileForm();
  const styles = useScreenStyles();

  const navigateNext = useCallback(() => {
    authNavigation.navigate(Routes.Auth.SelectLanguages);
  }, [authNavigation]);

  const handleSave = useSaveHandler(formState, formActions, navigateNext);

  useEffect(() => {
    if (formState.isNicknameReserved) {
      appNavigation.navigate(Routes.Sheet.NicknameReserved);
      formActions.dismissReservedModal();
    }
  }, [formState.isNicknameReserved, appNavigation, formActions]);

  return (
    <View style={styles.container} testID="profile-setup-screen">
      <ProfileSetupContent formState={formState} formActions={formActions} styles={styles} />
      <View style={styles.footer}>
        <SaveButton formState={formState} handleSave={handleSave} />
      </View>
    </View>
  );
}
